/**
 * GoddoY RK — js/pwa.js
 * Instalação PWA + Service Worker + Push Notifications
 */

'use strict';

const PWA = (() => {
    let deferredPrompt = null; // evento beforeinstallprompt
    let swRegistration = null;

    // ── Registrar Service Worker ─────────────────────────────
    async function registrarSW() {
        if (!('serviceWorker' in navigator)) return null;
        try {
            swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            console.log('[PWA] Service Worker registrado:', swRegistration.scope);
            return swRegistration;
        } catch (err) {
            console.warn('[PWA] SW não registrado:', err);
            return null;
        }
    }

    // ── Botão de instalação ──────────────────────────────────
    function initInstallButton() {
        const btn = document.getElementById('btnInstalarPWA');
        if (!btn) return;

        // Capturar evento de instalação
        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            deferredPrompt = e;
            btn.style.display = 'flex'; // mostrar botão
        });

        // Já instalado
        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            btn.style.display = 'none';
            mostrarToastPWA('GoddoY RK instalado com sucesso! 🏴');
        });

        // Clique no botão
        btn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                // iOS não suporta beforeinstallprompt — mostrar instruções
                mostrarInstrucoesIOS();
                return;
            }
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('[PWA] Usuário aceitou instalação');
            }
            deferredPrompt = null;
        });

        // Detectar iOS para mostrar instrução manual
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone;
        if (isIOS && !isStandalone) {
            btn.style.display = 'flex';
            btn.setAttribute('data-ios', 'true');
        }
    }

    function mostrarInstrucoesIOS() {
        const modal = document.getElementById('modalIOSInstall');
        if (modal) { modal.classList.add('visible'); return; }

        const div = document.createElement('div');
        div.id = 'modalIOSInstall';
        div.className = 'ios-install-modal';
        div.innerHTML = `
            <div class="ios-install-card">
                <button onclick="this.closest('#modalIOSInstall').remove()" class="ios-close"><i class="ri-close-line"></i></button>
                <div class="ios-install-icon">🏴</div>
                <h3>Instalar GoddoY RK</h3>
                <p>Para instalar no seu iPhone:</p>
                <ol>
                    <li>Toque em <strong>Compartilhar</strong> <i class="ri-share-line"></i> no Safari</li>
                    <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                    <li>Toque em <strong>Adicionar</strong></li>
                </ol>
                <p class="ios-note">O app ficará na sua tela inicial como um app nativo! 📱</p>
            </div>`;
        document.body.appendChild(div);
        div.classList.add('visible');
    }

    function mostrarToastPWA(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'toast visible success';
        setTimeout(() => el.classList.remove('visible'), 4000);
    }

    // ── Push Notifications ───────────────────────────────────
    async function solicitarPermissaoPush() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;

        const perm = await Notification.requestPermission();
        return perm === 'granted';
    }

    async function subscribePush(vapidPublicKey) {
        if (!swRegistration) await registrarSW();
        if (!swRegistration) return null;

        try {
            const existingSubscription = await swRegistration.pushManager.getSubscription();
            if (existingSubscription) return existingSubscription;

            if (!vapidPublicKey) return null;

            // Converter chave VAPID de base64url para Uint8Array
            const key = urlBase64ToUint8Array(vapidPublicKey);
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: key
            });

            // Enviar subscription para o servidor
            const token = window.AUTH?.getToken();
            if (token) {
                await fetch('/.netlify/functions/fac-push/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        subscription,
                        device_label: `${navigator.platform} · ${new Date().toLocaleDateString('pt-BR')}`
                    })
                }).catch(e => console.warn('[PWA] Erro ao salvar subscription:', e));
            }

            return subscription;
        } catch (err) {
            console.warn('[PWA] Erro ao fazer subscribe:', err);
            return null;
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
    }

    // ── Init ─────────────────────────────────────────────────
    async function init() {
        await registrarSW();
        initInstallButton();

        // Tentar subscribePush se já tem permissão
        if (Notification.permission === 'granted') {
            // Buscar VAPID public key do servidor
            try {
                const res  = await fetch('/.netlify/functions/fac-config');
                const data = await res.json().catch(() => ({}));
                if (data.vapidPublicKey) {
                    await subscribePush(data.vapidPublicKey);
                }
            } catch {}
        }
    }

    return { init, solicitarPermissaoPush, subscribePush, registrarSW, configurarInstall: initInstallButton };
})();

window.PWA = PWA;

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
    PWA.init();
}
