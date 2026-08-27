/**
 * GoddoY RK — Netlify Function: fac-posts
 * Feed social: criar posts, listar, comentar, curtir, denunciar
 * Upload de mídia via Supabase Storage
 */

const crypto = require('crypto');

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

async function sb(path, opts = {}) {
    const url = `${process.env.SUPABASE_URL}/rest/v1${path}`;
    const res = await fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation',
            ...(opts.headers || {})
        }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
}

function verificarToken(token) {
    try {
        const [header, body, sig] = token.split('.');
        const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
                               .update(`${header}.${body}`).digest('base64url');
        if (sig !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch { return null; }
}

// Upload de mídia para Supabase Storage
async function uploadMidia(base64Data, mimeType, bucket, fileName) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
    const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64');

    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
        method: 'POST',
        headers: {
            'Authorization':  `Bearer ${serviceKey}`,
            'apikey':         serviceKey,
            'Content-Type':   mimeType,
            'Content-Length': buffer.length
        },
        body: buffer
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error('Upload falhou: ' + JSON.stringify(err));
    }

    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
}

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

    const path   = event.path.replace('/.netlify/functions/fac-posts', '');
    const method = event.httpMethod;

    const token = (event.headers.authorization || '').replace('Bearer ', '');
    const usuario = verificarToken(token);
    if (!usuario) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Não autorizado. Faça login.' }) };

    try {

        // ── GET /feed — listar posts ──────────────────────────
        if (method === 'GET' && (path === '' || path === '/' || path === '/feed')) {
            const page  = parseInt(event.queryStringParameters?.page || '1');
            const limit = 20;
            const offset = (page - 1) * limit;

            const posts = await sb(
                `/posts?order=created_at.desc&limit=${limit}&offset=${offset}&select=*`
            );

            // Buscar comentários e likes para cada post
            const postIds = (posts || []).map(p => p.id);
            let comentarios = [];
            let likes       = [];

            if (postIds.length > 0) {
                const idsQuery = postIds.map(id => `post_id=eq.${id}`).join(',');
                comentarios = await sb(`/comentarios?or=(${idsQuery})&order=created_at.asc`).catch(() => []);
                likes       = await sb(`/post_likes?or=(${idsQuery})`).catch(() => []);
            }

            const postsComData = (posts || []).map(p => ({
                ...p,
                comentarios:  comentarios.filter(c => c.post_id === p.id).slice(-3),
                total_comentarios: comentarios.filter(c => c.post_id === p.id).length,
                eu_curti: likes.some(l => l.post_id === p.id && l.membro_id === usuario.id)
            }));

            return { statusCode: 200, headers: CORS, body: JSON.stringify(postsComData) };
        }

        // ── POST / — criar post ───────────────────────────────
        if (method === 'POST' && (path === '' || path === '/')) {
            const body = JSON.parse(event.body || '{}');
            const { conteudo, media_base64, media_tipo } = body;

            if (!conteudo && !media_base64) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Post vazio' }) };
            }

            let media_url = null;

            // Upload da mídia se enviada
            if (media_base64 && media_tipo) {
                const ext      = media_tipo === 'video' ? 'mp4' : 'jpg';
                const mimeType = media_tipo === 'video' ? 'video/mp4' : 'image/jpeg';
                const fileName = `${usuario.id}_${Date.now()}.${ext}`;
                media_url = await uploadMidia(media_base64, mimeType, 'posts-media', fileName);
            }

            // Buscar dados atuais do membro
            const mems = await sb(`/membros?id=eq.${usuario.id}&select=nick,cargo`);
            const mem  = mems?.[0] || { nick: usuario.nick, cargo: usuario.cargo };

            const created = await sb('/posts', {
                method: 'POST',
                body: JSON.stringify({
                    membro_id:  usuario.id,
                    nick:       mem.nick,
                    cargo:      mem.cargo,
                    conteudo:   conteudo || null,
                    media_url,
                    media_tipo: media_tipo || null
                })
            });

            return { statusCode: 201, headers: CORS, body: JSON.stringify(created[0]) };
        }

        // ── DELETE /:id — deletar post ────────────────────────
        const matchDelete = path.match(/^\/([0-9a-f-]+)$/);
        if (method === 'DELETE' && matchDelete) {
            const postId = matchDelete[1];
            const posts  = await sb(`/posts?id=eq.${postId}&select=membro_id`);
            if (!posts?.length) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Post não encontrado' }) };
            if (posts[0].membro_id !== usuario.id && !usuario.isAdmin) {
                return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Sem permissão' }) };
            }
            await sb(`/posts?id=eq.${postId}`, { method: 'DELETE' });
            return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
        }

        // ── POST /:id/curtir ──────────────────────────────────
        const matchCurtir = path.match(/^\/([0-9a-f-]+)\/curtir$/);
        if (method === 'POST' && matchCurtir) {
            const postId = matchCurtir[1];
            const jaLike = await sb(`/post_likes?post_id=eq.${postId}&membro_id=eq.${usuario.id}`);
            if (jaLike?.length > 0) {
                await sb(`/post_likes?post_id=eq.${postId}&membro_id=eq.${usuario.id}`, { method: 'DELETE' });
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ curtiu: false }) };
            } else {
                await sb('/post_likes', { method: 'POST', body: JSON.stringify({ post_id: postId, membro_id: usuario.id }) });
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ curtiu: true }) };
            }
        }

        // ── GET /:id/comentarios ──────────────────────────────
        const matchComGet = path.match(/^\/([0-9a-f-]+)\/comentarios$/);
        if (method === 'GET' && matchComGet) {
            const postId = matchComGet[1];
            const coments = await sb(`/comentarios?post_id=eq.${postId}&order=created_at.asc`);
            return { statusCode: 200, headers: CORS, body: JSON.stringify(coments || []) };
        }

        // ── POST /:id/comentarios ─────────────────────────────
        if (method === 'POST' && matchComGet) {
            const postId = matchComGet[1];
            const { conteudo } = JSON.parse(event.body || '{}');
            if (!conteudo?.trim()) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Comentário vazio' }) };
            if (conteudo.length > 500) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Comentário muito longo' }) };

            const mems = await sb(`/membros?id=eq.${usuario.id}&select=nick`);
            const created = await sb('/comentarios', {
                method: 'POST',
                body: JSON.stringify({ post_id: postId, membro_id: usuario.id, nick: mems?.[0]?.nick || usuario.nick, conteudo: conteudo.trim() })
            });
            return { statusCode: 201, headers: CORS, body: JSON.stringify(created[0]) };
        }

        return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Endpoint não encontrado' }) };

    } catch (err) {
        console.error('[fac-posts] Erro:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erro interno' }) };
    }
};
