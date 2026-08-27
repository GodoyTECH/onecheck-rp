/**
 * GoddoY RK — fac-membros.js
 * CRUD de membros: listar, ver perfil, atualizar nível/AK, desativar
 */
const { getDb }          = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const sub     = (event.path.replace(/.*\/fac-membros\/?/, '') || '').split('?')[0];
    const payload = verificarToken(extrairToken(event));
    if (!payload) return erro('Não autorizado', 401);

    const sql = getDb();

    try {
        // ── GET /  — listar todos os membros ─────────────────
        if (event.httpMethod === 'GET' && sub === '') {
            const cargo = event.queryStringParameters?.cargo;
            let rows;
            if (cargo && cargo !== 'todos') {
                rows = await sql`
                    SELECT id, nick, cargo, nivel, nivel_ak, pontos, avatar_url, bio, ultimo_acesso, is_ativo
                    FROM membros WHERE is_ativo = true AND cargo = ${cargo}
                    ORDER BY pontos DESC, nick ASC`;
            } else {
                rows = await sql`
                    SELECT id, nick, cargo, nivel, nivel_ak, pontos, avatar_url, bio, ultimo_acesso, is_ativo
                    FROM membros WHERE is_ativo = true
                    ORDER BY pontos DESC, nick ASC`;
            }
            return ok(rows);
        }

        // ── GET /me — perfil do usuário logado ────────────────
        if (event.httpMethod === 'GET' && sub === 'me') {
            const rows = await sql`
                SELECT id, nick, cargo, nivel, nivel_ak, pontos, avatar_url, bio,
                       nivel_notificado, nivel_ak_notificado, ultimo_acesso
                FROM membros WHERE id = ${payload.id} LIMIT 1`;
            if (!rows.length) return erro('Membro não encontrado', 404);
            return ok(rows[0]);
        }

        // ── GET /ranking — ordenado por pontos ────────────────
        if (event.httpMethod === 'GET' && sub === 'ranking') {
            const rows = await sql`
                SELECT id, nick, cargo, pontos, nivel, nivel_ak, avatar_url,
                       ROW_NUMBER() OVER (ORDER BY pontos DESC) AS posicao
                FROM membros WHERE is_ativo = true
                ORDER BY pontos DESC LIMIT 50`;
            return ok(rows);
        }

        // ── PATCH /me — atualizar próprio perfil (nível, AK, bio) ─
        if (event.httpMethod === 'PATCH' && sub === 'me') {
            const body = JSON.parse(event.body || '{}');
            const { nivel, nivel_ak, bio } = body;

            const updates = [];
            if (nivel    !== undefined && nivel    >= 1 && nivel    <= 100) updates.push({ col: 'nivel',    val: nivel });
            if (nivel_ak !== undefined && nivel_ak >= 1 && nivel_ak <= 50)  updates.push({ col: 'nivel_ak', val: nivel_ak });
            if (bio      !== undefined) updates.push({ col: 'bio', val: String(bio).slice(0, 200) });
            if (!updates.length) return erro('Nenhum campo válido para atualizar');

            // Buscar dados atuais para verificar notificações
            const current = await sql`SELECT nivel, nivel_ak, nivel_notificado, nivel_ak_notificado FROM membros WHERE id = ${payload.id}`;
            const cur = current[0];

            // Atualizar
            for (const u of updates) {
                if (u.col === 'nivel') {
                    await sql`UPDATE membros SET nivel = ${u.val}, nivel_notificado = ${u.val}, updated_at = NOW() WHERE id = ${payload.id}`;
                } else if (u.col === 'nivel_ak') {
                    await sql`UPDATE membros SET nivel_ak = ${u.val}, nivel_ak_notificado = ${u.val}, updated_at = NOW() WHERE id = ${payload.id}`;
                } else if (u.col === 'bio') {
                    await sql`UPDATE membros SET bio = ${u.val}, updated_at = NOW() WHERE id = ${payload.id}`;
                }
            }

            const updated = await sql`
                SELECT id, nick, cargo, nivel, nivel_ak, pontos, avatar_url, bio
                FROM membros WHERE id = ${payload.id} LIMIT 1`;
            return ok(updated[0]);
        }

        // ── POST /pontuar  (admin) ────────────────────────────
        if (event.httpMethod === 'POST' && sub === 'pontuar') {
            if (!payload.isAdmin) return erro('Apenas admins', 403);
            const { membro_id, pontos, motivo, acao = 'add' } = JSON.parse(event.body || '{}');
            if (!membro_id || !pontos || !motivo) return erro('Campos obrigatórios: membro_id, pontos, motivo');

            const delta = acao === 'remove' ? -Math.abs(pontos) : Math.abs(pontos);
            await sql`UPDATE membros SET pontos = GREATEST(0, pontos + ${delta}), updated_at = NOW() WHERE id = ${membro_id}`;

            const mem = await sql`SELECT nick FROM membros WHERE id = ${membro_id} LIMIT 1`;
            await sql`
                INSERT INTO pontuacao_historico (membro_id, nick, pontos, motivo, admin_id)
                VALUES (${membro_id}, ${mem[0]?.nick || ''}, ${delta}, ${motivo}, ${payload.id})`;

            // Notificação interna
            await sql`
                INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo)
                VALUES (${membro_id},
                    ${delta > 0 ? '📊 Pontos adicionados!' : '📉 Pontos removidos'},
                    ${`${delta > 0 ? '+' : ''}${delta} pts — ${motivo}`}, 'geral')`;

            return ok({ ok: true, delta });
        }

        // ── POST /promover  (admin) ───────────────────────────
        if (event.httpMethod === 'POST' && sub === 'promover') {
            if (!payload.isAdmin) return erro('Apenas admins', 403);
            const { membro_id, cargo_novo, motivo } = JSON.parse(event.body || '{}');
            if (!membro_id || !cargo_novo || !motivo) return erro('Campos obrigatórios');

            const cargoValidos = ['Recruta','Membro','Veterano','Oficial','Tenente','Gerente','Lider'];
            if (!cargoValidos.includes(cargo_novo)) return erro('Cargo inválido');

            const mem = await sql`SELECT nick, cargo FROM membros WHERE id = ${membro_id} LIMIT 1`;
            if (!mem.length) return erro('Membro não encontrado', 404);

            await sql`
                UPDATE membros SET cargo = ${cargo_novo},
                    is_admin = ${['Gerente','Lider'].includes(cargo_novo)},
                    updated_at = NOW()
                WHERE id = ${membro_id}`;

            await sql`
                INSERT INTO promocoes_historico (membro_id, nick, cargo_ant, cargo_novo, motivo, admin_id)
                VALUES (${membro_id}, ${mem[0].nick}, ${mem[0].cargo}, ${cargo_novo}, ${motivo}, ${payload.id})`;

            await sql`
                INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo)
                VALUES (${membro_id}, '🎖️ Você foi promovido!',
                    ${'Novo cargo: ' + cargo_novo + ' — ' + motivo}, 'promocao')`;

            return ok({ ok: true, cargo_novo });
        }

        // ── PATCH /:id/desativar  (admin) ─────────────────────
        const matchId = sub.match(/^([0-9a-f-]+)\/desativar$/);
        if (event.httpMethod === 'PATCH' && matchId) {
            if (!payload.isAdmin) return erro('Apenas admins', 403);
            await sql`UPDATE membros SET is_ativo = false, updated_at = NOW() WHERE id = ${matchId[1]}`;
            return ok({ ok: true });
        }

        return erro('Endpoint não encontrado', 404);
    } catch (e) {
        console.error('[fac-membros]', e.message);
        return erro('Erro interno', 500);
    }
};
