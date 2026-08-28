/**
 * GoddoY RK — js/auth.js
 * Lógica de autenticação via fac-auth (Netlify Function)
 * JWT armazenado em localStorage (lembrar) ou sessionStorage (sessão)
 */

'use strict';

const AUTH = (() => {
    const KEY_TOKEN  = 'grk_token';
    const KEY_ME     = 'grk_me';
    const API        = '/.netlify/functions/fac-auth';

    // ── Armazenamento ────────────────────────────────────────
    function saveToken(token, me, lembrar) {
        const store = lembrar ? localStorage : sessionStorage;
        store.setItem(KEY_TOKEN, token);
        store.setItem(KEY_ME, JSON.stringify(me));
        // Garantir que o outro storage não tem token antigo
        if (lembrar) sessionStorage.removeItem(KEY_TOKEN);
        else         localStorage.removeItem(KEY_TOKEN);
    }

    function getToken() {
        return localStorage.getItem(KEY_TOKEN) || sessionStorage.getItem(KEY_TOKEN);
    }

    function getMe() {
        const raw = localStorage.getItem(KEY_ME) || sessionStorage.getItem(KEY_ME);
        try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    }

    function isLoggedIn() {
        const token = getToken();
        if (!token) return false;
        // Verificar expiração do payload JWT (sem validar assinatura no client)
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            return payload.exp > Math.floor(Date.now() / 1000);
        } catch { return false; }
    }

    function logout(callServer = true) {
        const token = getToken();
        if (callServer && token) {
            fetch(`${API}/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});
        }
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_ME);
        sessionStorage.removeItem(KEY_TOKEN);
        sessionStorage.removeItem(KEY_ME);
    }

    // ── Login ────────────────────────────────────────────────
    async function login(nick, pin, lembrar = false) {
        const deviceInfo = `${navigator.userAgent.slice(0, 80)}`;
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: nick.trim(), pin: String(pin), lembrar, device_info: deviceInfo })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
        saveToken(data.token, data.membro, lembrar);
        return data.membro;
    }

    // ── Registrar ────────────────────────────────────────────
    async function registrar(nick, senha) {
        const res = await fetch(`${API}/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: nick.trim(), senha: String(senha) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
        saveToken(data.token, data.membro, true);
        return data.membro;
    }

    // ── Aprovar membro (admin) ───────────────────────────────
    async function aprovarMembro(membro_id, cargo) {
        const token = getToken();
        const res = await fetch(`${API}/aprovar-membro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ membro_id, cargo })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao aprovar membro');
        return data; 
    }

    // ── Header auth para fetch ───────────────────────────────
    function headers(extra = {}) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
            ...extra
        };
    }

    // ── Atualizar dados locais do usuário ────────────────────
    function atualizarMe(campos) {
        const me = getMe();
        if (!me) return;
        Object.assign(me, campos);
        const store = localStorage.getItem(KEY_TOKEN) ? localStorage : sessionStorage;
        store.setItem(KEY_ME, JSON.stringify(me));
    }

    return {
        saveToken, getToken, getMe, isLoggedIn, logout, headers, atualizarMe,
        login, registrar, aprovarMembro
    };
})();

window.AUTH = AUTH;
