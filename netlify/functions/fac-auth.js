/**
 * GoddoY RK — fac-auth.js
 * Login com nick + PIN 4 dígitos · Criação de membros pelo admin
 * Banco: Neon PostgreSQL via DATABASE_URL (integração nativa Netlify)
 */
const { getDb }            = require('./utils/db');
const { hashPin, verificarPin, gerarToken, verificarToken,
        extrairToken, ok, erro, preflight, gerarPin } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const sub = event.path.replace(/.*\/fac-auth\/?/, '') || '';

    try {
        // ────────────────────────────────────────────────────
        //  POST  (raiz ou /login) — Login
        // ────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && (sub === '' || sub === 'login')) {
            const { nick, pin, lembrar = false, device_info = '' } = JSON.parse(event.body || '{}');
            if (!nick?.trim() || !pin) return erro('Nick e PIN são obrigatórios');

            const sql = getDb();

            // Admin mestre via env vars (não precisa estar no banco ainda)
            const masterNick = process.env.ADMIN_MASTER_NICK || '';
            const masterPin  = process.env.ADMIN_MASTER_PIN  || '';

            let membro;

            if (nick.trim().toLowerCase() === masterNick.toLowerCase() && String(pin) === String(masterPin)) {
                // Garante que o admin mestre existe no banco
                const existing = await sql`SELECT * FROM membros WHERE nick ILIKE ${nick.trim()} LIMIT 1`;
                if (existing.length > 0) {
                    membro = existing[0];
                } else {
                    const { hash } = hashPin(String(pin));
                    const rows = await sql`
                        INSERT INTO membros (nick, pin_hash, cargo, is_admin)
                        VALUES (${nick.trim()}, ${hash}, 'Lider', true)
                        RETURNING *`;
                    membro = rows[0];
                }
            } else {
                const rows = await sql`SELECT * FROM membros WHERE nick ILIKE ${nick.trim()} AND is_ativo = true LIMIT 1`;
                if (!rows.length) return erro('Nick não encontrado ou inativo', 401);
                membro = rows[0];
                if (!verificarPin(String(pin), membro.pin_hash)) return erro('PIN incorreto', 401);
            }

            const dias  = lembrar ? 30 : 1;
            const token = gerarToken({ id: membro.id, nick: membro.nick, cargo: membro.cargo, isAdmin: membro.is_admin }, dias);

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
                    id: membro.id, nick: membro.nick, cargo: membro.cargo,
                    nivel: membro.nivel, nivel_ak: membro.nivel_ak,
                    pontos: membro.pontos, avatar_url: membro.avatar_url,
                    is_admin: membro.is_admin
                }
            });
        }

        // ────────────────────────────────────────────────────
        //  POST /logout
        // ────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && sub === 'logout') {
            const token = extrairToken(event);
            if (token) {
                const sql = getDb();
                await sql`DELETE FROM sessoes WHERE token_hash = md5(${token})`;
            }
            return ok({ ok: true });
        }

        // ────────────────────────────────────────────────────
        //  POST /criar-membro  (admin)
        // ────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && sub === 'criar-membro') {
            const payload = verificarToken(extrairToken(event));
            if (!payload?.isAdmin) return erro('Apenas admins podem criar membros', 403);

            const { nick, cargo = 'Recruta' } = JSON.parse(event.body || '{}');
            if (!nick?.trim() || nick.trim().length < 2) return erro('Nick inválido');

            const pin = gerarPin();
            const { hash } = hashPin(pin);
            const sql = getDb();

            try {
                const rows = await sql`
                    INSERT INTO membros (nick, pin_hash, cargo, is_admin)
                    VALUES (${nick.trim()}, ${hash}, ${cargo}, ${['Gerente','Lider'].includes(cargo)})
                    RETURNING id, nick, cargo`;

                return ok({ membro: rows[0], pin, aviso: 'Envie este PIN ao novo integrante. Ele não pode ser recuperado.' }, 201);
            } catch (e) {
                if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
                    return erro('Nick já cadastrado', 409);
                }
                throw e;
            }
        }

        // ────────────────────────────────────────────────────
        //  POST /resetar-pin  (admin)
        // ────────────────────────────────────────────────────
        if (event.httpMethod === 'POST' && sub === 'resetar-pin') {
            const payload = verificarToken(extrairToken(event));
            if (!payload?.isAdmin) return erro('Apenas admins', 403);

            const { membro_id } = JSON.parse(event.body || '{}');
            if (!membro_id) return erro('membro_id obrigatório');

            const pin = gerarPin();
            const { hash } = hashPin(pin);
            const sql = getDb();

            const rows = await sql`
                UPDATE membros SET pin_hash = ${hash}
                WHERE id = ${membro_id}
                RETURNING nick`;
            if (!rows.length) return erro('Membro não encontrado', 404);

            return ok({ nick: rows[0].nick, pin, aviso: 'Envie o novo PIN ao membro.' });
        }

        return erro('Endpoint não encontrado', 404);

    } catch (e) {
        console.error('[fac-auth]', e.message);
        return erro('Erro interno do servidor', 500);
    }
};
