/**
 * GoddoY RK — fac-config.js
 * Configurações da plataforma + notificações do usuário
 * Retorna: configuração da temporada, notificações não lidas
 */
const { getDb }          = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const sub = (event.path.replace(/.*\/fac-config\/?/, '') || '').split('?')[0];
    const sql = getDb();

    try {
        // ── GET / — configurações públicas da plataforma ──────
        if (event.httpMethod === 'GET' && sub === '') {
            const rows = await sql`SELECT chave, valor FROM config`;
            const cfg  = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
            return ok({
                temporada:       cfg.temporada_atual  || '75',
                temporada_inicio: cfg.temporada_inicio || '',
                temporada_fim:   cfg.temporada_fim    || '',
                nome_gangue:     cfg.nome_gangue      || 'GoddoY RK',
                max_membros:     parseInt(cfg.max_membros || '45'),
                pvp_horario:     cfg.pvp_horario      || '20:00',
                evento_horario:  cfg.evento_horario   || '21:00',
                pvidPublicKey:   process.env.VAPID_PUBLIC_KEY || null
            });
        }

        // ── POST /config — salvar configurações (admin) ───────
        if (event.httpMethod === 'POST' && sub === 'config') {
            const payload = verificarToken(extrairToken(event));
            if (!payload?.isAdmin) return erro('Apenas admins', 403);

            const campos = JSON.parse(event.body || '{}');
            for (const [chave, valor] of Object.entries(campos)) {
                await sql`
                    INSERT INTO config (chave, valor) VALUES (${chave}, ${String(valor)})
                    ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`;
            }
            return ok({ ok: true });
        }

        // ── GET /notificacoes — notificações do usuário logado ─
        if (event.httpMethod === 'GET' && sub === 'notificacoes') {
            const payload = verificarToken(extrairToken(event));
            if (!payload) return erro('Não autorizado', 401);

            const rows = await sql`
                SELECT id, titulo, mensagem, tipo, lida, created_at
                FROM notificacoes WHERE membro_id = ${payload.id}
                ORDER BY created_at DESC LIMIT 30`;
            return ok(rows);
        }

        // ── POST /notificacoes/ler — marcar como lida ─────────
        if (event.httpMethod === 'POST' && sub === 'notificacoes/ler') {
            const payload = verificarToken(extrairToken(event));
            if (!payload) return erro('Não autorizado', 401);

            const { notif_id } = JSON.parse(event.body || '{}');
            if (notif_id) {
                await sql`UPDATE notificacoes SET lida = true WHERE id = ${notif_id} AND membro_id = ${payload.id}`;
            } else {
                await sql`UPDATE notificacoes SET lida = true WHERE membro_id = ${payload.id}`;
            }
            return ok({ ok: true });
        }

        // ── GET /conquistas — conquistas da temporada ─────────
        if (event.httpMethod === 'GET' && sub === 'conquistas') {
            const payload = verificarToken(extrairToken(event));
            if (!payload) return erro('Não autorizado', 401);

            const rows = await sql`SELECT tipo, nick_vencedor FROM conquistas ORDER BY tipo`;
            return ok(rows);
        }

        // ── POST /conquistas — salvar conquistas (admin) ──────
        if (event.httpMethod === 'POST' && sub === 'conquistas') {
            const payload = verificarToken(extrairToken(event));
            if (!payload?.isAdmin) return erro('Apenas admins', 403);

            const conquistas = JSON.parse(event.body || '{}'); // { tipo: nick }
            const cfg = await sql`SELECT valor FROM config WHERE chave = 'temporada_atual' LIMIT 1`;
            const temporada = parseInt(cfg[0]?.valor || '75');

            for (const [tipo, nick] of Object.entries(conquistas)) {
                await sql`
                    INSERT INTO conquistas (temporada, tipo, nick_vencedor)
                    VALUES (${temporada}, ${tipo}, ${nick})
                    ON CONFLICT (temporada, tipo) DO UPDATE SET nick_vencedor = EXCLUDED.nick_vencedor, updated_at = NOW()`;
            }
            return ok({ ok: true });
        }

        return erro('Endpoint não encontrado', 404);
    } catch (e) {
        console.error('[fac-config]', e.message);
        return erro('Erro interno', 500);
    }
};
