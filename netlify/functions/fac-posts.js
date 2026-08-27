/**
 * GoddoY RK — fac-posts.js
 * Feed social: posts com foto/vídeo, curtidas, comentários
 * Upload de mídia via Netlify Blobs
 */
const { getDb }          = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');
const { getStore }       = require('@netlify/blobs');

async function uploadMidia(base64Data, mimeType, fileName) {
    const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64');
    if (buffer.length > 52_428_800) throw new Error('Arquivo muito grande (máx 50 MB)');
    const store = getStore({ name: 'posts-media', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
    await store.set(fileName, buffer, { metadata: { contentType: mimeType } });
    return `/.netlify/functions/fac-posts/media/${fileName}`;
}

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const payload = verificarToken(extrairToken(event));
    if (!payload) return erro('Não autorizado', 401);

    const sql = getDb();
    const sub = (event.path.replace(/.*\/fac-posts\/?/, '') || '').split('?')[0];
    const qp  = event.queryStringParameters || {};

    try {
        // ── GET /media/:key — servir mídia ────────────────────
        if (event.httpMethod === 'GET' && sub.startsWith('media/')) {
            const key   = sub.replace('media/', '');
            const store = getStore({ name: 'posts-media', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
            const meta  = await store.getMetadata(key).catch(() => null);
            const blob  = await store.get(key, { type: 'arrayBuffer' }).catch(() => null);
            if (!blob) return erro('Mídia não encontrada', 404);
            return {
                statusCode: 200,
                headers: { 'Content-Type': meta?.metadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=2592000' },
                body: Buffer.from(blob).toString('base64'),
                isBase64Encoded: true
            };
        }

        // ── GET / — feed de posts ─────────────────────────────
        if (event.httpMethod === 'GET' && sub === '') {
            const page   = Math.max(1, parseInt(qp.page || '1'));
            const limit  = 20;
            const offset = (page - 1) * limit;

            const posts = await sql`
                SELECT p.*, 
                    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.membro_id = ${payload.id}) AS eu_curti,
                    (SELECT COUNT(*) FROM comentarios c WHERE c.post_id = p.id) AS total_comentarios
                FROM posts p
                ORDER BY p.created_at DESC
                LIMIT ${limit} OFFSET ${offset}`;

            return ok(posts);
        }

        // ── POST / — criar post ───────────────────────────────
        if (event.httpMethod === 'POST' && sub === '') {
            const body = JSON.parse(event.body || '{}');
            const { conteudo, media_base64, media_tipo } = body;
            if (!conteudo?.trim() && !media_base64) return erro('Post não pode ser vazio');

            let media_url = null;
            if (media_base64 && media_tipo) {
                const ext      = media_tipo === 'video' ? 'mp4' : 'jpg';
                const mimeType = media_tipo === 'video' ? 'video/mp4' : 'image/jpeg';
                media_url = await uploadMidia(media_base64, mimeType, `${payload.id}_${Date.now()}.${ext}`);
            }

            const mem  = await sql`SELECT nick, cargo FROM membros WHERE id = ${payload.id} LIMIT 1`;
            const rows = await sql`
                INSERT INTO posts (membro_id, nick, cargo, conteudo, media_url, media_tipo)
                VALUES (${payload.id}, ${mem[0].nick}, ${mem[0].cargo},
                        ${conteudo?.trim() || null}, ${media_url}, ${media_tipo || null})
                RETURNING *`;
            return ok(rows[0], 201);
        }

        // ── DELETE /:id — apagar post ─────────────────────────
        const matchId = sub.match(/^([0-9a-f-]+)$/);
        if (event.httpMethod === 'DELETE' && matchId) {
            const postId = matchId[1];
            const p = await sql`SELECT membro_id FROM posts WHERE id = ${postId} LIMIT 1`;
            if (!p.length) return erro('Post não encontrado', 404);
            if (p[0].membro_id !== payload.id && !payload.isAdmin) return erro('Sem permissão', 403);
            await sql`DELETE FROM posts WHERE id = ${postId}`;
            return ok({ ok: true });
        }

        // ── POST /:id/curtir ──────────────────────────────────
        const matchCurtir = sub.match(/^([0-9a-f-]+)\/curtir$/);
        if (event.httpMethod === 'POST' && matchCurtir) {
            const postId = matchCurtir[1];
            const exists = await sql`SELECT 1 FROM post_likes WHERE post_id = ${postId} AND membro_id = ${payload.id}`;
            if (exists.length > 0) {
                await sql`DELETE FROM post_likes WHERE post_id = ${postId} AND membro_id = ${payload.id}`;
                return ok({ curtiu: false });
            } else {
                await sql`INSERT INTO post_likes (post_id, membro_id) VALUES (${postId}, ${payload.id}) ON CONFLICT DO NOTHING`;
                return ok({ curtiu: true });
            }
        }

        // ── GET /:id/comentarios ──────────────────────────────
        const matchCom = sub.match(/^([0-9a-f-]+)\/comentarios$/);
        if (event.httpMethod === 'GET' && matchCom) {
            const rows = await sql`
                SELECT id, nick, conteudo, created_at
                FROM comentarios WHERE post_id = ${matchCom[1]}
                ORDER BY created_at ASC LIMIT 50`;
            return ok(rows);
        }

        // ── POST /:id/comentarios ─────────────────────────────
        if (event.httpMethod === 'POST' && matchCom) {
            const { conteudo } = JSON.parse(event.body || '{}');
            if (!conteudo?.trim()) return erro('Comentário vazio');
            if (conteudo.length > 500) return erro('Comentário muito longo');
            const mem  = await sql`SELECT nick FROM membros WHERE id = ${payload.id} LIMIT 1`;
            const rows = await sql`
                INSERT INTO comentarios (post_id, membro_id, nick, conteudo)
                VALUES (${matchCom[1]}, ${payload.id}, ${mem[0].nick}, ${conteudo.trim()})
                RETURNING *`;
            return ok(rows[0], 201);
        }

        return erro('Endpoint não encontrado', 404);
    } catch (e) {
        console.error('[fac-posts]', e.message);
        return erro('Erro interno: ' + e.message, 500);
    }
};
