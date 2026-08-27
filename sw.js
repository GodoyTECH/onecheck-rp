/**
 * GoddoY RK — Service Worker
 * Suporte a: cache offline, push notifications, background sync
 */

const CACHE_NAME    = 'godoy-rk-v1';
const CACHE_STATIC  = [
    '/',
    '/index.html',
    '/css/platform.css',
    '/js/platform.js',
    '/js/auth.js',
    '/js/pwa.js',
    '/js/regras-rp.js',
    '/js/ia-engine.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css'
];

// ── Instalação: cache dos arquivos estáticos ─────────────────
self.addEventListener('install', event => {
    console.log('[SW] Instalando GoddoY RK v1...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(CACHE_STATIC.map(url => {
                return new Request(url, { mode: 'no-cors' });
            })).catch(err => {
                console.warn('[SW] Alguns arquivos não cacheados:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// ── Ativação: limpar caches antigos ─────────────────────────
self.addEventListener('activate', event => {
    console.log('[SW] Ativando...');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network first para API, cache first para estáticos ─
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Não interceptar chamadas às Netlify Functions
    if (url.pathname.startsWith('/.netlify/functions/')) return;
    if (url.pathname.startsWith('/api/')) return;

    // Estratégia: Network first, fallback para cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cachear respostas bem-sucedidas de recursos estáticos
                if (response.ok && ['GET'].includes(event.request.method)) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Offline: retornar do cache
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    // Se for navegação, retornar página principal
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', event => {
    let data = {};
    try { data = event.data.json(); } catch { data = { title: 'GoddoY RK', body: event.data.text() }; }

    const title   = data.title || 'GoddoY RK';
    const options = {
        body:    data.body   || 'Nova notificação da gangue!',
        icon:    data.icon   || '/icons/icon-192.png',
        badge:   data.badge  || '/icons/icon-96.png',
        image:   data.image  || undefined,
        tag:     data.tag    || 'godoy-rk-' + Date.now(),
        renotify: true,
        vibrate: [200, 100, 200],
        sound:   '/sounds/notif.mp3',
        data: {
            url:  data.url  || '/',
            tipo: data.tipo || 'geral'
        },
        actions: [
            { action: 'abrir',   title: '🏴 Abrir',    icon: '/icons/icon-96.png' },
            { action: 'fechar',  title: '✖ Fechar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ── Clique na notificação ────────────────────────────────────
self.addEventListener('notificationclick', event => {
    const notif = event.notification;
    notif.close();

    if (event.action === 'fechar') return;

    const url = notif.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Se já tem uma janela aberta, focar nela
            const existing = windowClients.find(c => c.url === url && 'focus' in c);
            if (existing) return existing.focus();
            // Abrir nova janela
            return clients.openWindow(url);
        })
    );
});

// ── Background sync (reenviar mensagens offline) ─────────────
self.addEventListener('sync', event => {
    if (event.tag === 'sync-mensagens') {
        event.waitUntil(syncMensagensPendentes());
    }
});

async function syncMensagensPendentes() {
    try {
        const cache   = await caches.open(CACHE_NAME);
        const pending = await cache.match('pending-messages');
        if (!pending) return;
        const msgs = await pending.json();
        for (const msg of msgs) {
            await fetch('/.netlify/functions/fac-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${msg.token}` },
                body: JSON.stringify(msg)
            });
        }
        await cache.delete('pending-messages');
    } catch (e) {
        console.warn('[SW] Sync falhou:', e);
    }
}
