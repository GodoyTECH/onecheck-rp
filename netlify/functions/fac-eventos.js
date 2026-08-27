/**
 * GoddoY RK — fac-eventos.js
 * Backend para gerenciar e listar Tarefas e Eventos (e seus horários).
 */
const { getDb } = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const payload = verificarToken(extrairToken(event));
    if (!payload) return erro('Não autorizado', 401);

    const sql = getDb();
    const sub = (event.path.replace(/.*\/fac-eventos\/?/, '') || '').split('?')[0];

    try {
        // ── GET / — listar todos os eventos e tarefas ────────
        if (event.httpMethod === 'GET' && sub === '') {
            // Retorna eventos agrupados com seus horários
            const eventos = await sql`SELECT * FROM eventos_tarefas ORDER BY criado_em ASC`;
            const horarios = await sql`SELECT * FROM eventos_horarios ORDER BY horario ASC`;
            
            // Agrupar horários dentro dos eventos
            const mapHorarios = {};
            horarios.forEach(h => {
                if (!mapHorarios[h.evento_id]) mapHorarios[h.evento_id] = [];
                mapHorarios[h.evento_id].push({
                    id: h.id,
                    horario: h.horario.substring(0, 5), // '13:20'
                    descricao: h.descricao
                });
            });

            const result = eventos.map(e => ({
                id: e.id,
                titulo: e.titulo,
                tipo: e.tipo,
                meta_diaria: e.meta_diaria,
                meta_mensal: e.meta_mensal,
                horarios: mapHorarios[e.id] || []
            }));

            return ok(result);
        }

        // Tudo a partir daqui requer permissão de admin
        if (!payload.isAdmin) return erro('Acesso restrito', 403);

        // ── POST / — criar novo evento/tarefa ────────────────
        if (event.httpMethod === 'POST' && sub === '') {
            const body = JSON.parse(event.body || '{}');
            const { titulo, tipo, meta_diaria = 0, meta_mensal = 0, horarios = [] } = body;

            if (!titulo || !tipo) return erro('Título e tipo (evento/tarefa) são obrigatórios');

            const rows = await sql`
                INSERT INTO eventos_tarefas (titulo, tipo, meta_diaria, meta_mensal)
                VALUES (${titulo}, ${tipo}, ${meta_diaria}, ${meta_mensal})
                RETURNING *`;
            
            const novoEv = rows[0];

            if (horarios.length > 0) {
                // Inserção em massa dos horários
                const values = horarios.map(h => ({
                    evento_id: novoEv.id,
                    horario: h.hora + ':00', // Ex: '13:20:00'
                    descricao: h.descricao || ''
                }));
                // Inserir
                for(let v of values) {
                    await sql`
                        INSERT INTO eventos_horarios (evento_id, horario, descricao)
                        VALUES (${v.evento_id}, ${v.horario}, ${v.descricao})
                    `;
                }
            }

            return ok({ success: true, id: novoEv.id }, 201);
        }

        // ── DELETE /:id — excluir evento/tarefa ──────────────
        const matchDel = sub.match(/^([0-9a-f-]+)$/);
        if (event.httpMethod === 'DELETE' && matchDel) {
            const id = matchDel[1];
            await sql`DELETE FROM eventos_tarefas WHERE id = ${id}`;
            return ok({ success: true, deleted_id: id });
        }

        return erro('Endpoint não encontrado', 404);
    } catch (err) {
        console.error('[FAC-EVENTOS]', err);
        return erro('Erro interno: ' + err.message, 500);
    }
};
