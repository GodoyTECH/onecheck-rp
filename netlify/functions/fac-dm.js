/**
 * GoddoY RK — fac-dm.js
 * Conversas privadas (DMs): criar conversa, listar, enviar/receber mensagens
 */
const { getDb }          = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const payload = verificarToken(extrairToken(event));
    if (!payload) return erro('Não autorizado', 401);

    const sql = getDb();
    const sub = (event.path.replace(/.*\/fac-dm\/?/, '') || '').split('?')[0];
    const qp  = event.queryStringParameters || {};

    try {
        // ── GET / — lista de conversas do usuário ────────────
        if (event.httpMethod === 'GET' && sub === '') {
            const rows = await sql`
                SELECT c.id, c.ultima_msg, c.ultima_msg_ts,
                    CASE WHEN c.membro1_id = ${payload.id} THEN m2.nick ELSE m1.nick END AS outro_nick,
                    CASE WHEN c.membro1_id = ${payload.id} THEN m2.cargo ELSE m1.cargo END AS outro_cargo,
                    CASE WHEN c.membro1_id = ${payload.id} THEN m2.id ELSE m1.id END AS outro_id,
                    (SELECT COUNT(*) FROM mensagens_dm md
                     WHERE md.conversa_id = c.id AND md.remetente_id != ${payload.id} AND md.lida = false) AS nao_lidas
                FROM conversas c
                JOIN membros m1 ON m1.id = c.membro1_id
                JOIN membros m2 ON m2.id = c.membro2_id
                WHERE c.membro1_id = ${payload.id} OR c.membro2_id = ${payload.id}
                ORDER BY c.ultima_msg_ts DESC NULLS LAST`;
            return ok(rows);
        }

        // ── POST / — iniciar ou recuperar conversa ────────────
        if (event.httpMethod === 'POST' && sub === '') {
            const { outro_id } = JSON.parse(event.body || '{}');
            if (!outro_id) return erro('outro_id obrigatório');
            if (outro_id === payload.id) return erro('Não pode conversar consigo mesmo');

            // Verificar se já existe (em qualquer direção)
            const existing = await sql`
                SELECT id FROM conversas
                WHERE (membro1_id = ${payload.id} AND membro2_id = ${outro_id})
                   OR (membro1_id = ${outro_id}   AND membro2_id = ${payload.id})
                LIMIT 1`;

            if (existing.length > 0) return ok({ conversa_id: existing[0].id });

            const outro = await sql`SELECT nick, cargo FROM membros WHERE id = ${outro_id} AND is_ativo = true LIMIT 1`;
            if (!outro.length) return erro('Membro não encontrado', 404);

            const rows = await sql`
                INSERT INTO conversas (membro1_id, membro2_id)
                VALUES (${payload.id}, ${outro_id})
                RETURNING id`;
            return ok({ conversa_id: rows[0].id }, 201);
        }

        // ── GET /:id/mensagens — listar mensagens da conversa ─
        const matchMsgs = sub.match(/^([0-9a-f-]+)\/mensagens$/);
        if (event.httpMethod === 'GET' && matchMsgs) {
            const convId = matchMsgs[1];
            // Verificar que o usuário é participante
            const conv = await sql`
                SELECT id FROM conversas
                WHERE id = ${convId} AND (membro1_id = ${payload.id} OR membro2_id = ${payload.id})
                LIMIT 1`;
            if (!conv.length) return erro('Conversa não encontrada', 404);

            const since = qp.since;
            let rows;
            if (since) {
                rows = await sql`
                    SELECT id, remetente_id, tipo, conteudo, lida, created_at
                    FROM mensagens_dm WHERE conversa_id = ${convId} AND created_at > ${since}
                    ORDER BY created_at ASC`;
            } else {
                rows = await sql`
                    SELECT id, remetente_id, tipo, conteudo, lida, created_at
                    FROM mensagens_dm WHERE conversa_id = ${convId}
                    ORDER BY created_at DESC LIMIT 60`;
                rows = rows.reverse();
            }

            // Marcar como lidas as mensagens do outro
            await sql`
                UPDATE mensagens_dm SET lida = true
                WHERE conversa_id = ${convId} AND remetente_id != ${payload.id} AND lida = false`;

            return ok(rows);
        }

        // ── POST /:id/mensagens — enviar mensagem ─────────────
        if (event.httpMethod === 'POST' && matchMsgs) {
            const convId = matchMsgs[1];
            const conv   = await sql`
                SELECT id, membro1_id, membro2_id FROM conversas
                WHERE id = ${convId} AND (membro1_id = ${payload.id} OR membro2_id = ${payload.id})
                LIMIT 1`;
            if (!conv.length) return erro('Conversa não encontrada', 404);

            const { conteudo, tipo = 'texto' } = JSON.parse(event.body || '{}');
            if (!conteudo?.trim() && tipo === 'texto') return erro('Vazia');

            const outro_id = conv[0].membro1_id === payload.id ? conv[0].membro2_id : conv[0].membro1_id;

            let extractedMentions = [];
            const textToParse = conteudo.trim();
            const mentionMatches = textToParse.match(/@([A-Za-z0-9_]+)/g) || [];

            if (mentionMatches.length > 0) {
                const nicks = mentionMatches.map(m => m.substring(1).toLowerCase());
                const uniqueNicks = [...new Set(nicks)];
                
                const users = await sql`SELECT id, nick FROM membros WHERE LOWER(nick) = ANY(${uniqueNicks})`;
                extractedMentions = users.map(u => ({ userId: u.id, username: u.nick }));
                
                for (const u of extractedMentions) {
                    if (u.userId !== payload.id) {
                        await sql`
                            INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo)
                            VALUES (${u.userId}, 'Você foi mencionado (DM)', ${payload.nick} + ' mencionou você em uma DM.', 'geral')
                        `;
                    }
                }
            }

            const rows = await sql`
                INSERT INTO mensagens_dm (conversa_id, remetente_id, tipo, conteudo, mentions)
                VALUES (${convId}, ${payload.id}, ${tipo}, ${textToParse}, ${JSON.stringify(extractedMentions)}::jsonb)
                RETURNING *`;

            await sql`
                UPDATE conversas
                SET ultima_msg = ${tipo === 'texto' ? textToParse.slice(0,50) : '[Mídia]'},
                    ultima_msg_ts = NOW()
                WHERE id = ${convId}`;

            // Enviar notificação simples (se não foi mencionado no texto, envia a de msg nova normal)
            // if you want normal notifications...

            return ok(rows[0], 201);
        }

        return erro('Endpoint não encontrado', 404);
    } catch (e) {
        console.error('[fac-dm]', e.message);
        return erro('Erro interno', 500);
    }
};
