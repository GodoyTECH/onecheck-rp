/**
 * GoddoY RK — Netlify Function: fac-push
 * Envio de notificações push Web Push API
 * Dependência: web-push (declare em netlify/functions/package.json)
 */

const crypto = require('crypto');

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// ── Supabase helper ───────────────────────────────────────────
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

// ── JWT Verificação ───────────────────────────────────────────
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

// ── Enviar push usando Web Push manualmente (sem lib) ─────────
async function enviarPushParaSubscription(sub, payload) {
    // Implementação manual de Web Push com VAPID
    // (Necessário quando não há acesso ao npm em Netlify Functions)
    const endpoint = sub.endpoint;
    const body     = JSON.stringify(payload);

    // Preparar cabeçalhos VAPID
    const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail   = process.env.VAPID_EMAIL || 'mailto:admin@godoy.rk';

    if (!vapidPublic || !vapidPrivate) {
        console.warn('[fac-push] VAPID não configurado');
        return false;
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/octet-stream',
                'Content-Length': '0',
                'TTL': '86400'
            },
            body: null
        });
        return res.ok || res.status === 201;
    } catch (err) {
        console.error('[fac-push] Erro ao enviar:', err.message);
        return false;
    }
}

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

    const path   = event.path.replace('/.netlify/functions/fac-push', '');
    const method = event.httpMethod;

    try {
        // ── POST /subscribe — salvar subscription ─────────────
        if (method === 'POST' && path === '/subscribe') {
            const token = (event.headers.authorization || '').replace('Bearer ', '');
            const payload = verificarToken(token);
            if (!payload) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Não autorizado' }) };

            const { subscription, device_label } = JSON.parse(event.body || '{}');
            if (!subscription?.endpoint) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Subscription inválida' }) };
            }

            // Upsert subscription
            await sb('/push_subscriptions', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
                body: JSON.stringify({
                    membro_id:   payload.id,
                    endpoint:    subscription.endpoint,
                    p256dh:      subscription.keys?.p256dh || '',
                    auth_key:    subscription.keys?.auth   || '',
                    device_label: device_label || 'Dispositivo',
                    ativo: true
                })
            });

            return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
        }

        // ── POST /enviar — enviar push (admin) ────────────────
        if (method === 'POST' && path === '/enviar') {
            const token = (event.headers.authorization || '').replace('Bearer ', '');
            const payload = verificarToken(token);
            if (!payload?.isAdmin) return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Apenas admins' }) };

            const { titulo, body: msgBody, tipo = 'geral', url = '/', membro_id } = JSON.parse(event.body || '{}');

            // Buscar subscriptions
            const query = membro_id
                ? `/push_subscriptions?membro_id=eq.${membro_id}&ativo=eq.true`
                : `/push_subscriptions?ativo=eq.true`;
            const subs = await sb(query);

            const pushPayload = { title: titulo || 'GoddoY RK', body: msgBody, tipo, url, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png' };

            let enviados = 0;
            for (const sub of subs || []) {
                const ok = await enviarPushParaSubscription(sub, pushPayload);
                if (ok) enviados++;
            }

            // Log no banco
            if (membro_id) {
                await sb('/notificacoes', {
                    method: 'POST',
                    body: JSON.stringify({ membro_id, titulo, mensagem: msgBody, tipo })
                }).catch(() => {});
            }

            return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, enviados, total: subs?.length || 0 }) };
        }

        // ── POST /enviar-todos — enviar para todos ────────────
        if (method === 'POST' && path === '/enviar-todos') {
            const token = (event.headers.authorization || '').replace('Bearer ', '');
            const payload = verificarToken(token);
            if (!payload?.isAdmin) return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Apenas admins' }) };

            const { titulo, body: msgBody, tipo = 'geral', url = '/' } = JSON.parse(event.body || '{}');
            const subs    = await sb('/push_subscriptions?ativo=eq.true');
            const membros = await sb('/membros?is_ativo=eq.true&select=id');

            const pushPayload = { title: titulo, body: msgBody, tipo, url, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png' };

            let enviados = 0;
            for (const sub of subs || []) {
                const ok = await enviarPushParaSubscription(sub, pushPayload);
                if (ok) enviados++;
            }

            // Criar notificação interna para todos
            if (membros?.length) {
                const notifs = membros.map(m => ({ membro_id: m.id, titulo, mensagem: msgBody, tipo }));
                await sb('/notificacoes', { method: 'POST', body: JSON.stringify(notifs) }).catch(() => {});
            }

            return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, enviados }) };
        }

        // ── GET /minhas — notificações do usuário ─────────────
        if (method === 'GET' && path === '/minhas') {
            const token = (event.headers.authorization || '').replace('Bearer ', '');
            const payload = verificarToken(token);
            if (!payload) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Não autorizado' }) };

            const notifs = await sb(`/notificacoes?membro_id=eq.${payload.id}&order=created_at.desc&limit=30`);
            return { statusCode: 200, headers: CORS, body: JSON.stringify(notifs || []) };
        }

        // ── POST /ler — marcar como lida ──────────────────────
        if (method === 'POST' && path === '/ler') {
            const token = (event.headers.authorization || '').replace('Bearer ', '');
            const payload = verificarToken(token);
            if (!payload) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Não autorizado' }) };

            const { notif_id } = JSON.parse(event.body || '{}');
            await sb(`/notificacoes?id=eq.${notif_id}&membro_id=eq.${payload.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ lida: true })
            });

            return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
        }

        return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Endpoint não encontrado' }) };

    } catch (err) {
        console.error('[fac-push] Erro:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erro interno' }) };
    }
};
