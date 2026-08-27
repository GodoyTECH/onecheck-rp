/**
 * GoddoY RK — fac-tarefas.js
 * CRUD de tarefas/missões. Criação notifica todos os membros via push.
 */
const { getDb }          = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const payload = verificarToken(extrairToken(event));
    if (!payload) return erro('Não autorizado', 401);

    const sql = getDb();
    const sub = (event.path.replace(/.*\/fac-tarefas\/?/, '') || '').split('?')[0];

    try {
        // ── GET / — listar tarefas ativas ─────────────────────
        if (event.httpMethod === 'GET' && sub === '') {
            const tarefas = await sql`
                SELECT t.*, m.nick AS criado_por_nick,
                    (SELECT COUNT(*) FROM tarefas_concluidas tc WHERE tc.tarefa_id = t.id) AS total_concluiu,
                    EXISTS (SELECT 1 FROM tarefas_concluidas tc WHERE tc.tarefa_id = t.id AND tc.membro_id = ${payload.id}) AS eu_concluí
                FROM tarefas t
                LEFT JOIN membros m ON m.id = t.criado_por
                WHERE t.ativa = true
                ORDER BY t.created_at DESC`;
            return ok(tarefas);
        }

        // ── POST / — criar tarefa (admin) ─────────────────────
        if (event.httpMethod === 'POST' && sub === '') {
            if (!payload.isAdmin) return erro('Apenas admins podem criar tarefas', 403);
            const { titulo, descricao, pontos = 500 } = JSON.parse(event.body || '{}');
            if (!titulo?.trim()) return erro('Título obrigatório');
            if (!descricao?.trim()) return erro('Descrição obrigatória');

            const rows = await sql`
                INSERT INTO tarefas (titulo, descricao, pontos, criado_por)
                VALUES (${titulo.trim()}, ${descricao.trim()}, ${Number(pontos)}, ${payload.id})
                RETURNING *`;
            const tarefa = rows[0];

            // Notificar todos os membros
            const membros = await sql`SELECT id FROM membros WHERE is_ativo = true AND id != ${payload.id}`;
            if (membros.length > 0) {
                const notifs = membros.map(m => ({
                    membro_id: m.id,
                    titulo: '⚔️ Nova Missão disponível!',
                    mensagem: `${titulo.trim()} — Recompensa: ${pontos} pts`,
                    tipo: 'tarefa',
                    referencia_id: tarefa.id
                }));
                // Inserir em lote
                for (const n of notifs) {
                    await sql`INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo, referencia_id)
                              VALUES (${n.membro_id}, ${n.titulo}, ${n.mensagem}, ${n.tipo}, ${n.referencia_id})`;
                }
            }

            return ok(tarefa, 201);
        }

        // ── POST /:id/concluir — marcar como concluída ────────
        const matchId = sub.match(/^([0-9a-f-]+)\/concluir$/);
        if (event.httpMethod === 'POST' && matchId) {
            const tarefaId = matchId[1];
            try {
                await sql`
                    INSERT INTO tarefas_concluidas (tarefa_id, membro_id)
                    VALUES (${tarefaId}, ${payload.id})`;
            } catch (e) {
                if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
                    return erro('Você já concluiu esta tarefa', 409);
                }
                throw e;
            }
            return ok({ ok: true });
        }

        // ── DELETE /:id — desativar tarefa (admin) ────────────
        const matchDel = sub.match(/^([0-9a-f-]+)$/);
        if (event.httpMethod === 'DELETE' && matchDel) {
            if (!payload.isAdmin) return erro('Apenas admins', 403);
            await sql`UPDATE tarefas SET ativa = false WHERE id = ${matchDel[1]}`;
            return ok({ ok: true });
        }

        return erro('Endpoint não encontrado', 404);
    } catch (e) {
        console.error('[fac-tarefas]', e.message);
        return erro('Erro interno', 500);
    }
};
