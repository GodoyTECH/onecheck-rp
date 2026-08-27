/**
 * GoddoY RK — fac-chat.js
 * Chat geral: listar mensagens, enviar texto, upload de áudio via Netlify Blobs
 */
const { getDb }          = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');
const { getStore }       = require('@netlify/blobs');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const payload = verificarToken(extrairToken(event));
    if (!payload) return erro('Não autorizado', 401);

    const sql = getDb();
    const sub = (event.path.replace(/.*\/fac-chat\/?/, '') || '').split('?')[0];

    try {
        // ── GET / — últimas 60 mensagens ─────────────────────
        if (event.httpMethod === 'GET' && sub === '') {
            const since = event.queryStringParameters?.since; // ISO timestamp
            let rows;
            if (since) {
                rows = await sql`
                    SELECT id, membro_id, nick, cargo, tipo, conteudo, media_url, created_at
                    FROM mensagens_gerais
                    WHERE created_at > ${since}
                    ORDER BY created_at ASC LIMIT 100`;
            } else {
                rows = await sql`
                    SELECT id, membro_id, nick, cargo, tipo, conteudo, media_url, created_at
                    FROM mensagens_gerais
                    ORDER BY created_at DESC LIMIT 60`;
                rows = rows.reverse();
            }
            return ok(rows);
        }

        // ── POST / — enviar mensagem de texto ─────────────────
        if (event.httpMethod === 'POST' && sub === '') {
            const body = JSON.parse(event.body || '{}');
            const { conteudo, tipo = 'texto' } = body;

            if (!conteudo?.trim() && tipo === 'texto') return erro('Mensagem vazia');
            if (conteudo?.length > 500) return erro('Mensagem muito longa (máx 500 caracteres)');

            // Buscar nick/cargo atualizado
            const mem = await sql`SELECT nick, cargo FROM membros WHERE id = ${payload.id} LIMIT 1`;
            const { nick, cargo } = mem[0] || { nick: payload.nick, cargo: payload.cargo };

            if (cargo === 'Pendente') return erro('Sua conta ainda não foi aprovada.', 403);

            let extractedMentions = [];
            const textToParse = conteudo.trim();
            const mentionMatches = textToParse.match(/@([A-Za-z0-9_]+)/g) || [];

            if (mentionMatches.length > 0) {
                const nicks = mentionMatches.map(m => m.substring(1).toLowerCase());
                const uniqueNicks = [...new Set(nicks)];
                
                // Fetch real user IDs
                const users = await sql`SELECT id, nick FROM membros WHERE LOWER(nick) = ANY(${uniqueNicks})`;
                
                extractedMentions = users.map(u => ({ userId: u.id, username: u.nick }));
                
                // Insert Notifications
                for (const u of extractedMentions) {
                    if (u.userId !== payload.id) {
                        await sql`
                            INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo)
                            VALUES (${u.userId}, 'Você foi mencionado', ${nick} + ' mencionou você no Chat Geral.', 'geral')
                        `;
                    }
                }
            }

            const rows = await sql`
                INSERT INTO mensagens_gerais (membro_id, nick, cargo, tipo, conteudo, mentions)
                VALUES (${payload.id}, ${nick}, ${cargo}, ${tipo}, ${textToParse}, ${JSON.stringify(extractedMentions)}::jsonb)
                RETURNING *`;

            return ok(rows[0], 201);
        }

        // ── POST /audio — upload de áudio ─────────────────────
        if (event.httpMethod === 'POST' && sub === 'audio') {
            const body = JSON.parse(event.body || '{}');
            const { audio_base64, duracao = 0 } = body;

            if (!audio_base64) return erro('Nenhum áudio enviado');
            if (duracao > 120) return erro('Áudio muito longo (máx 2 minutos)');

            // Salvar no Netlify Blobs
            const buffer  = Buffer.from(audio_base64.split(',')[1] || audio_base64, 'base64');
            const store   = getStore({ name: 'chat-audio', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
            const blobKey = `${payload.id}_${Date.now()}.webm`;
            await store.set(blobKey, buffer, { metadata: { contentType: 'audio/webm', membroId: payload.id } });

            const audioUrl = `/.netlify/functions/fac-chat/audio-file/${blobKey}`;

            const mem = await sql`SELECT nick, cargo FROM membros WHERE id = ${payload.id} LIMIT 1`;
            const { nick, cargo } = mem[0] || { nick: payload.nick, cargo: payload.cargo };

            const rows = await sql`
                INSERT INTO mensagens_gerais (membro_id, nick, cargo, tipo, conteudo, media_url)
                VALUES (${payload.id}, ${nick}, ${cargo}, 'audio', '[Áudio]', ${audioUrl})
                RETURNING *`;

            return ok(rows[0], 201);
        }

        // ── GET /audio-file/:key — servir áudio ───────────────
        if (event.httpMethod === 'GET' && sub.startsWith('audio-file/')) {
            const key = sub.replace('audio-file/', '');
            const store = getStore({ name: 'chat-audio', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
            const blob  = await store.get(key, { type: 'arrayBuffer' });
            if (!blob) return erro('Áudio não encontrado', 404);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'audio/webm', 'Cache-Control': 'private, max-age=86400' },
                body: Buffer.from(blob).toString('base64'),
                isBase64Encoded: true
            };
        }

        return erro('Endpoint não encontrado', 404);
    } catch (e) {
        console.error('[fac-chat]', e.message);
        return erro('Erro interno', 500);
    }
};
