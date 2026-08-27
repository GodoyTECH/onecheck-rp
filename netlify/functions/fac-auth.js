/**
 * GoddoY RK — fac-auth.js
 * Login: nick do jogo + senha gerada pelo admin
 * A senha fica salva em texto simples no banco → admin pode ver/resetar
 * Banco: Neon PostgreSQL via DATABASE_URL
 */
const { getDb }         = require('./utils/db');
const { gerarToken, verificarToken, extrairToken,
        ok, erro, preflight } = require('./utils/auth');

/* Gera uma senha de 4 dígitos numéricos */
function gerarSenha() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const sub = event.path.replace(/.*\/fac-auth\/?/, '') || '';

    try {
        const sql = getDb();

        // ─────────────────────────────────────────────────────
        //  POST  (raiz ou /login) — Login com nick + senha
        // ─────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && (sub === '' || sub === 'login')) {
            const { nick, pin: senha, lembrar = false, device_info = '' } = JSON.parse(event.body || '{}');
            if (!nick?.trim() || !senha) return erro('Nick e senha são obrigatórios');

            let membro;
            let isAdminLogin = false;

            // Admin mestre via variáveis de ambiente (fallback de emergência)
            // Checa ADMIN_MASTER, ADMIN2, ADMIN3, etc.
            const adminsCfg = [
                { nick: process.env.ADMIN_MASTER_NICK, senha: process.env.ADMIN_MASTER_PIN },
                { nick: process.env.ADMIN2_NICK, senha: process.env.ADMIN2_PIN },
                { nick: process.env.ADMIN3_NICK, senha: process.env.ADMIN3_PIN },
                { nick: process.env.ADMIN4_NICK, senha: process.env.ADMIN4_PIN },
                { nick: process.env.ADMIN5_NICK, senha: process.env.ADMIN5_PIN }
            ];

            for (const admin of adminsCfg) {
                if (admin.nick && admin.senha && nick.trim().toLowerCase() === admin.nick.toLowerCase() && String(senha) === String(admin.senha)) {
                    isAdminLogin = true;
                    // Garante que o admin existe no banco
                    const existing = await sql`SELECT * FROM membros WHERE nick ILIKE ${nick.trim()} LIMIT 1`;
                    if (existing.length > 0) {
                        membro = existing[0];
                    } else {
                        // Cria o admin no banco com a senha em texto plano
                        const rows = await sql`
                            INSERT INTO membros (nick, senha, cargo, is_admin)
                            VALUES (${nick.trim()}, ${String(admin.senha)}, 'Lider', true)
                            RETURNING *`;
                        membro = rows[0];
                    }
                    break;
                }
            }

            if (!isAdminLogin) {
                // Login normal: busca pelo nick, compara senha em texto plano
                const rows = await sql`
                    SELECT * FROM membros
                    WHERE nick ILIKE ${nick.trim()} AND is_ativo = true
                    LIMIT 1`;
                if (!rows.length) return erro('Nick não encontrado ou inativo', 401);
                membro = rows[0];

                if (!membro.senha || membro.senha !== String(senha)) {
                    return erro('Senha incorreta', 401);
                }
            }

            const dias  = lembrar ? 30 : 1;
            const token = gerarToken(
                { id: membro.id, nick: membro.nick, cargo: membro.cargo, isAdmin: membro.is_admin },
                dias
            );

            // Registrar sessão
            await sql`
                INSERT INTO sessoes (membro_id, token_hash, device_info, lembrar, expires_at)
                VALUES (${membro.id}, md5(${token}), ${device_info}, ${lembrar},
                        NOW() + (${dias} || ' days')::interval)
                ON CONFLICT DO NOTHING`;

            await sql`UPDATE membros SET ultimo_acesso = NOW() WHERE id = ${membro.id}`;

            return ok({
                token,
                membro: {
                    id:        membro.id,
                    nick:      membro.nick,
                    cargo:     membro.cargo,
                    nivel:     membro.nivel,
                    nivel_ak:  membro.nivel_ak,
                    pontos:    membro.pontos,
                    avatar_url:membro.avatar_url,
                    bio:       membro.bio,
                    is_admin:  membro.is_admin
                }
            });
        }

        // ─────────────────────────────────────────────────────
        //  POST /logout
        // ─────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && sub === 'logout') {
            const token = extrairToken(event);
            if (token) {
                await sql`DELETE FROM sessoes WHERE token_hash = md5(${token})`;
            }
            return ok({ ok: true });
        }

        // ─────────────────────────────────────────────────────
        //  POST /criar-membro  (admin)
        //  Cria membro com senha gerada → retorna senha para o admin
        // ─────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && sub === 'criar-membro') {
            const payload = verificarToken(extrairToken(event));
            if (!payload?.isAdmin) return erro('Apenas admins podem criar membros', 403);

            const { nick, cargo = 'Recruta' } = JSON.parse(event.body || '{}');
            if (!nick?.trim() || nick.trim().length < 2) return erro('Nick inválido (mínimo 2 caracteres)');

            const senha = gerarSenha();

            try {
                const rows = await sql`
                    INSERT INTO membros (nick, senha, cargo, is_admin)
                    VALUES (${nick.trim()}, ${senha}, ${cargo}, ${['Gerente','Lider'].includes(cargo)})
                    RETURNING id, nick, cargo`;

                return ok({
                    membro: rows[0],
                    pin: senha,   // mantém campo "pin" para compatibilidade com o frontend
                    senha,
                    aviso: 'Envie esta senha ao novo integrante. Ele poderá alterá-la após o primeiro login.'
                }, 201);
            } catch (e) {
                if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
                    return erro('Nick já cadastrado', 409);
                }
                throw e;
            }
        }

        // ─────────────────────────────────────────────────────
        //  POST /resetar-senha  (admin)
        //  Gera nova senha e salva em texto plano → retorna para o admin
        // ─────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && (sub === 'resetar-pin' || sub === 'resetar-senha')) {
            const payload = verificarToken(extrairToken(event));
            if (!payload?.isAdmin) return erro('Apenas admins podem resetar senhas', 403);

            const { membro_id } = JSON.parse(event.body || '{}');
            if (!membro_id) return erro('membro_id obrigatório');

            const senha = gerarSenha();

            const rows = await sql`
                UPDATE membros SET senha = ${senha}
                WHERE id = ${membro_id}
                RETURNING nick`;
            if (!rows.length) return erro('Membro não encontrado', 404);

            return ok({ nick: rows[0].nick, pin: senha, senha });
        }

        // ─────────────────────────────────────────────────────
        //  POST /alterar-senha  (membro logado altera a própria senha)
        // ─────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && sub === 'alterar-senha') {
            const payload = verificarToken(extrairToken(event));
            if (!payload) return erro('Não autenticado', 401);

            const { senha_atual, senha_nova } = JSON.parse(event.body || '{}');
            if (!senha_atual || !senha_nova) return erro('senha_atual e senha_nova são obrigatórias');
            if (String(senha_nova).length < 4 || String(senha_nova).length > 20) {
                return erro('A nova senha deve ter entre 4 e 20 caracteres');
            }

            // Verificar senha atual
            const rows = await sql`SELECT senha FROM membros WHERE id = ${payload.id}`;
            if (!rows.length || rows[0].senha !== String(senha_atual)) {
                return erro('Senha atual incorreta', 401);
            }

            await sql`UPDATE membros SET senha = ${String(senha_nova)} WHERE id = ${payload.id}`;
            return ok({ ok: true, mensagem: 'Senha alterada com sucesso' });
        }

        // ─────────────────────────────────────────────────────
        //  GET /ver-senhas  (admin — lista nick + senha de todos)
        // ─────────────────────────────────────────────────────
        if (event.httpMethod === 'GET' && sub === 'ver-senhas') {
            const payload = verificarToken(extrairToken(event));
            if (!payload?.isAdmin) return erro('Apenas admins', 403);

            const rows = await sql`
                SELECT id, nick, cargo, senha, is_ativo, created_at
                FROM membros
                ORDER BY nick ASC`;

            return ok({ membros: rows });
        }

        return erro('Endpoint não encontrado', 404);

    } catch (e) {
        console.error('[fac-auth]', e.message);
        return erro('Erro interno do servidor', 500);
    }
};
