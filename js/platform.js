/**
 * GoddoY RK — js/platform.js
 * Lógica principal da SPA — roteamento, carregamento de dados, interações
 * Depende de: auth.js, pwa.js, api.js, state.js, components.js
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES E VIEWS
═══════════════════════════════════════════════════════════ */
const VIEWS = {
    home:          { id: 'viewHome',         title: 'Início',        back: false },
    ranking:       { id: 'viewRanking',      title: 'Ranking',       back: false },
    chat:          { id: 'viewChat',         title: 'Chat Geral',    back: false },
    dm:            { id: 'viewDM',           title: 'Mensagens',     back: false },
    dmConversa:    { id: 'viewDMConversa',   title: '',              back: true  },
    missoes:       { id: 'viewMissoes',      title: 'Missões',       back: false },
    conquistas:    { id: 'viewConquistas',   title: 'Conquistas',    back: true  },
    perfil:        { id: 'viewPerfil',       title: 'Perfil',        back: false },
    membroPerfil:  { id: 'viewMembroPerfil', title: 'Perfil',        back: true  },
    notificacoes:  { id: 'viewNotificacoes', title: 'Notificações',  back: true  },
    config:        { id: 'viewConfig',       title: 'Configurações', back: true  },
    admin:         { id: 'viewAdmin',        title: 'Admin',         back: true  },
};

const CHAT_POLL_MS  = 3000;   // polling do chat
const DM_POLL_MS    = 4000;   // polling de DMs
const NOTIF_POLL_MS = 30000;  // polling de notificações

let currentView      = 'home';
let chatPollTimer    = null;
let dmPollTimer      = null;
let notifPollTimer   = null;
let activeConversaId = null;
let pinBuffer        = '';
let lembrar          = false;
let audioRecorder    = null;
let audioChunks      = [];
let isRecording      = false;
let pontuarSelectedId = null;
let pontuarAcao      = 'add';

/* ═══════════════════════════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar splash
    showEl('appLoading');

    try {
        // PWA: registrar service worker
        if (window.PWA) {
            await PWA.registrarSW();
            PWA.configurarInstall(
                document.getElementById('btnInstalarPWA'),
                document.getElementById('iosInstallModal')
            );
        }

        // Verificar se já está logado
        if (AUTH.isLoggedIn()) {
            await iniciarApp();
        } else {
            mostrarLogin();
        }
    } catch (err) {
        console.error('[INIT]', err);
        mostrarLogin();
    }

    inicializarEventListeners();
});

/* ═══════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════ */
function mostrarLogin() {
    hideEl('appLoading');
    showEl('loginScreen');
    hideEl('appShell');
    document.getElementById('loginNickInput')?.focus();
}

async function iniciarApp() {
    MENTIONS.init();
    try {
        // Carregar dados do usuário logado
        const me = await API.getMe().catch(() => null);
        if (!me) {
            AUTH.logout();
            mostrarLogin();
            return;
        }

        STATE.setUser(me);

        // Carregar configurações
        const cfg = await API.getConfig().catch(() => ({}));
        STATE.config = cfg;

        hideEl('appLoading');
        hideEl('loginScreen');
        showEl('appShell');

        // Preencher UI com dados do usuário
        atualizarUIUsuario();

        // Elementos de admin
        const adminEls = document.querySelectorAll('.admin-only');
        adminEls.forEach(el => {
            if (STATE.user.is_admin) el.classList.remove('hidden');
        });

        // Navegar para home
        navigateTo('home');

        // Iniciar polling de notificações
        iniciarPollingNotificacoes();

        // Verificar lembrete de nível
        verificarLembrete();

    } catch (err) {
        console.error('[INIT APP]', err);
        AUTH.logout();
        mostrarLogin();
    }
}

function atualizarUIUsuario() {
    const u = STATE.user;
    if (!u) return;

    // Sidebar
    setTextById('sidebarNick', u.nick || '—');
    setTextById('sidebarCargo', u.cargo || '—');
    setAvatarEl(document.getElementById('sidebarAvatar'), u.nick, u.avatar_url);
    setAvatarEl(document.getElementById('topbarAvatar'), u.nick, u.avatar_url);

    // Home
    setTextById('homeNick', u.nick || '—');
    setTextById('homeCargo', u.cargo || '—');
    setAvatarEl(document.getElementById('homeAvatar'), u.nick, u.avatar_url);
    setTextById('homeLevel', `NÍVEL ${u.nivel || 1}`);
    const xpCur = (u.nivel || 1) * 100;
    const xpMax = ((u.nivel || 1) + 1) * 250;
    setTextById('homeXpCurrent', GRK.formatPts(u.pontos || 0));
    setTextById('homeXpMax', GRK.formatPts(xpMax));
    const xpPct = Math.min(100, Math.round((xpCur / xpMax) * 100));
    setStyle('homeXpFill', 'width', xpPct + '%');
    setTextById('homeTemporada', STATE.config?.temporada || '—');

    // Perfil
    setTextById('perfilNick', u.nick || '—');
    setTextById('perfilCargo', u.cargo || '—');
    setAvatarEl(document.getElementById('perfilAvatar'), u.nick, u.avatar_url);
    setTextById('perfilLevel', `NÍVEL ${u.nivel || 1}`);
    setTextById('perfilXP', `${u.pontos || 0} XP`);
    setTextById('perfilPontos', GRK.formatPts(u.pontos || 0));
    setTextById('perfilNivelAK', u.nivel_ak || 1);
    const xpPerc = Math.min(100, Math.round(((u.nivel || 1) * 100) / (((u.nivel || 1) + 1) * 250) * 100));
    setStyle('perfilXpFill', 'width', xpPerc + '%');
    setTextById('perfilXpCurrent', GRK.formatPts(u.pontos || 0));
    setTextById('perfilXpMax', GRK.formatPts(((u.nivel || 1) + 1) * 250));

    // badge de cargo
    document.querySelectorAll('.badge.badge-cargo').forEach(el => {
        el.textContent = u.cargo || '—';
        el.className = `badge badge-cargo badge-cargo-${(u.cargo || 'recruta').toLowerCase()}`;
    });
}

/* ═══════════════════════════════════════════════════════════
   ROTEAMENTO / NAVEGAÇÃO
═══════════════════════════════════════════════════════════ */
function navigateTo(viewName, extra = {}) {
    const view = VIEWS[viewName];
    if (!view) return;

    // Parar polling anterior se saiu do chat/dm
    if (currentView === 'chat' && viewName !== 'chat') pararChatPolling();
    if (currentView === 'dmConversa' && viewName !== 'dmConversa') pararDMPolling();

    // Esconder view atual
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(v => v.classList.remove('active'));
    allViews.forEach(v => v.classList.add('hidden'));

    // Mostrar view destino
    const targetEl = document.getElementById(view.id);
    if (targetEl) {
        targetEl.classList.remove('hidden');
        targetEl.classList.add('active');
        targetEl.scrollTop = 0;
    }

    // Topbar
    setTextById('topbarTitle', view.title || extra.title || '');
    const backBtn = document.getElementById('topbarBack');
    if (backBtn) {
        if (view.back) {
            backBtn.classList.remove('hidden');
        } else {
            backBtn.classList.add('hidden');
        }
    }

    // Nav ativa (mobile + sidebar)
    const navViews = ['home', 'chat', 'ranking', 'missoes', 'membros', 'perfil'];
    const navKey   = navViews.includes(viewName) ? viewName : null;

    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === navKey);
    });
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === navKey);
    });

    currentView = viewName;

    // Carregar dados da view
    switch (viewName) {
        case 'home':        carregarHome();         break;
        case 'ranking':     carregarRanking();      break;
        case 'chat':        entrarNoChat();         break;
        case 'dm':          carregarDMs();          break;
        case 'dmConversa':  entrarNaConversa(extra.conversaId, extra.titulo); break;
        case 'missoes':     carregarMissoes();      break;
        case 'conquistas':  carregarConquistas();   break;
        case 'perfil':      carregarPerfil();       break;
        case 'membroPerfil':carregarMembroPerfil(extra.membroId); break;
        case 'notificacoes':carregarNotificacoes(); break;
        case 'config':      carregarConfig();       break;
        case 'admin':       carregarAdmin();        break;
    }
}

/* ═══════════════════════════════════════════════════════════
   HOME
═══════════════════════════════════════════════════════════ */
async function carregarHome() {
    atualizarUIUsuario();

    // Ranking (posição do usuário)
    try {
        const ranking = await API.getRanking();
        STATE.ranking = ranking;
        const myPos = ranking.findIndex(r => r.id === STATE.user?.id);
        if (myPos >= 0) {
            setTextById('homeRankPos', `#${myPos + 1}`);
            setTextById('homeRankPts', `${GRK.formatPts(ranking[myPos].pontos)} PTS`);
            setTextById('perfilRanking', `#${myPos + 1}`);
            setTextById('perfilMissoes', ranking[myPos].missoes || '—');
        }
    } catch (e) { /* silencioso */ }

    // Atividade recente (notificações como activity feed)
    try {
        const notifs = await API.getNotificacoes();
        const feed   = document.getElementById('activityFeed');
        if (!feed) return;
        if (!notifs?.length) {
            feed.innerHTML = GRK.emptyState('ri-activity-line', 'Nenhuma atividade', 'Suas atividades recentes vão aparecer aqui');
            return;
        }
        feed.innerHTML = notifs.slice(0, 5).map(n => `
            <div class="activity-item">
                <div class="activity-icon">${notifIcon(n.tipo)}</div>
                <div class="activity-info">
                    <div class="activity-text">${escapeHtml(n.mensagem)}</div>
                    <div class="activity-time">${GRK.timeAgo(n.created_at)}</div>
                </div>
            </div>
        `).join('');
    } catch (e) { /* silencioso */ }
}

/* ═══════════════════════════════════════════════════════════
   RANKING
═══════════════════════════════════════════════════════════ */
async 
// -----------------------------------------
// PUBLIC ROSTER & PERFIL EDIT
// -----------------------------------------
let allMembrosRoster = [];

async function carregarRosterPublico() {
    const grid = document.getElementById('rosterGrid');
    if(!grid) return;
    grid.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    
    try {
        allMembrosRoster = await API.getMembros() || [];
        document.getElementById('totalMembrosRoster').textContent = allMembrosRoster.length;
        const totalPts = allMembrosRoster.reduce((acc, m) => acc + (m.pontos || 0), 0);
        const gbMembros = document.getElementById('gbMembrosGerais');
        if(gbMembros) gbMembros.textContent = allMembrosRoster.length + '/45';
        const gbPontos = document.getElementById('gbPontosGerais');
        if(gbPontos) gbPontos.textContent = totalPts;
        renderRoster(allMembrosRoster);
    } catch(e) {
        grid.innerHTML = '<div class="form-error">Erro ao carregar membros</div>';
    }
}

function renderRoster(lista) {
    const grid = document.getElementById('rosterGrid');
    if(!grid) return;
    
    if(lista.length === 0) {
        grid.innerHTML = '<div class="empty-state">Nenhum membro encontrado.</div>';
        return;
    }
    
    grid.innerHTML = lista.map(m => `
        <div class="roster-card" onclick="verPerfil('${m.id}')" style="cursor:pointer;">
            ${ m.avatar_url ? `<img src="${m.avatar_url}" class="roster-card-avatar">` : `<div class="roster-card-avatar" style="display:flex;align-items:center;justify-content:center;"><i class="ri-user-line"></i></div>` }
            <div class="roster-card-info">
                <div class="roster-card-nick">${escapeHtml(m.nick)} ${m.is_admin ? '<i class="ri-shield-star-line text-gold" title="Admin"></i>' : ''}</div>
                <div class="roster-card-cargo">${escapeHtml(m.cargo)}</div>
            </div>
            ${ STATE.user.is_admin && m.id !== STATE.user.id ? `
                <div class="roster-card-actions" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="abrirModalPromover('${m.id}', '${escapeHtml(m.nick)}', '${m.cargo}')"><i class="ri-arrow-up-circle-line"></i></button>
                    <button class="btn-icon" style="color:var(--red);" onclick="desativarMembro('${m.id}')"><i class="ri-user-unfollow-line"></i></button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

document.getElementById('rosterSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtrados = allMembrosRoster.filter(m => 
        (m.nick || '').toLowerCase().includes(q) || 
        (m.cargo || '').toLowerCase().includes(q)
    );
    renderRoster(filtrados);
});

// Listener for Perfil Edit
document.getElementById('btnSalvarEditPerfil')?.addEventListener('click', async () => {
    const nick = document.getElementById('editPerfilNick').value.trim();
    const senha = document.getElementById('editPerfilSenha').value.trim();
    
    const updates = {};
    if (nick) updates.nick = nick;
    if (senha) updates.senha = senha; // Will need a backend endpoint or modify fac-membros to accept this
    
    if (Object.keys(updates).length === 0) {
        return GRK.toast('Nenhuma alteração informada', 'info');
    }
    
    const btn = document.getElementById('btnSalvarEditPerfil');
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i>';
    
    try {
        await fetch('/.netlify/functions/fac-membros/' + STATE.user.id + '/editar-perfil', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.getToken() },
            body: JSON.stringify(updates)
        });
        
        GRK.toast('Perfil atualizado! Faça login novamente.', 'success');
        setTimeout(() => AUTH.logout(), 2000);
    } catch(e) {
        GRK.toast('Erro ao atualizar perfil', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Salvar';
    }
});

// Handle nav view "membros"
// I will patch the bottom nav listener directly via regex in the platform.js code.

async function carregarRanking() {
    // Mostrar skeletons
    const list = document.getElementById('rankingList');
    if (list) list.innerHTML = '<div class="skeleton-card"></div>'.repeat(5);

    try {
        const ranking = await API.getRanking();
        STATE.ranking  = ranking;

        const temporada = STATE.config?.temporada || '—';
        setTextById('rankingTemporada', `TEMPORADA ${temporada}`);

        // Pódio Top 3
        [1, 2, 3].forEach(pos => {
            const r = ranking[pos - 1];
            if (!r) return;
            const isMe = r.id === STATE.user?.id;
            setTextById(`podiumNick${pos}`, r.nick || '—');
            setTextById(`podiumPts${pos}`, `${GRK.formatPts(r.pontos)} PTS`);
            setAvatarEl(document.getElementById(`podiumAvatar${pos}`), r.nick, r.avatar_url, isMe);
        });

        // Lista #4+
        const myId = STATE.user?.id;
        if (list) {
            const rest = ranking.slice(3);
            if (!rest.length) {
                list.innerHTML = GRK.emptyState('ri-trophy-line', 'Apenas 3 membros', 'O ranking completo aparece a partir do 4º lugar');
                return;
            }
            list.innerHTML = rest.map((r, i) => {
                const pos  = i + 4;
                const isMe = r.id === myId;
                return `
                    <div class="rank-item ${isMe ? 'rank-item-me' : ''}">
                        <div class="rank-position">#${pos}</div>
                        <div class="avatar avatar-sm rank-avatar">${GRK.getInitials(r.nick)}</div>
                        <div class="rank-info">
                            <div class="rank-nick">${escapeHtml(r.nick)}${isMe ? ' <span class="rank-you">VOCÊ</span>' : ''}</div>
                            <div class="rank-cargo">${r.cargo || ''}</div>
                        </div>
                        <div class="rank-pts">${GRK.formatPts(r.pontos)} PTS</div>
                    </div>
                `;
            }).join('');
        }

        // Timer: temporada fictícia (sem data real da API ainda)
        iniciarTimerRound();

    } catch (e) {
        if (list) list.innerHTML = GRK.emptyState('ri-error-warning-line', 'Erro ao carregar', 'Não foi possível carregar o ranking', 'Tentar novamente', 'carregarRanking()');
    }
}

function iniciarTimerRound() {
    const el = document.getElementById('rankingTimerText');
    if (!el) return;
    // Próximo domingo às 23:59 como referência visual
    const now    = new Date();
    const target = new Date();
    target.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
    target.setHours(23, 59, 59, 0);

    function atualizar() {
        const diff = target - new Date();
        if (diff <= 0) { el.textContent = 'ENCERRADO'; return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        el.textContent = `${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
    }
    atualizar();
    setInterval(atualizar, 60000);
}

/* ═══════════════════════════════════════════════════════════
   CHAT GERAL
═══════════════════════════════════════════════════════════ */
async function entrarNoChat() {
    const msgArea = document.getElementById('chatMessages');
    if (!msgArea) return;
    msgArea.innerHTML = '<div class="chat-loading"><div class="chat-spinner"></div></div>';

    try {
        const msgs = await API.getChatMsgs();
        STATE.chatMsgs    = msgs;
        STATE.chatLastTs  = msgs.length ? msgs[msgs.length - 1].created_at : null;
        renderizarChatMsgs(msgs, true);
    } catch (e) {
        if (msgArea) msgArea.innerHTML = GRK.emptyState('ri-wifi-off-line', 'Sem conexão', 'Não foi possível carregar o chat');
    }

    // Iniciar polling
    pararChatPolling();
    chatPollTimer = setInterval(pollChat, CHAT_POLL_MS);

    // Membros online (participantes)
    carregarParticipantes();
}

async function pollChat() {
    if (currentView !== 'chat') { pararChatPolling(); return; }
    try {
        const since = STATE.chatLastTs;
        const novas = await API.getChatMsgs(since);
        if (novas?.length) {
            STATE.chatLastTs = novas[novas.length - 1].created_at;
            renderizarChatMsgs(novas, false);
        }
    } catch (e) { /* silencioso */ }
}

function pararChatPolling() {
    if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
}

function renderizarChatMsgs(msgs, clear = false) {
    const area  = document.getElementById('chatMessages');
    if (!area) return;
    const atBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 100;

    if (clear) area.innerHTML = '';

    if (clear && !msgs.length) {
        area.innerHTML = GRK.emptyState('ri-message-3-line', 'Nenhuma mensagem', 'Seja o primeiro a falar!');
        return;
    }

    const myId = STATE.user?.id;
    msgs.forEach(msg => {
        if (document.getElementById(`msg-${msg.id}`)) return; // já renderizado
        const isMe = msg.membro_id === myId;
        const el = document.createElement('div');
        el.id = `msg-${msg.id}`;
        el.innerHTML = GRK.chatMessage(msg, isMe);
        area.appendChild(el);
    });

    if (clear || atBottom) {
        area.scrollTop = area.scrollHeight;
    }
}

async function enviarChatMsg() {
    const input = document.getElementById('chatInput');
    const txt   = input?.value?.trim();
    if (!txt) return;

    input.value = '';
    input.style.height = 'auto';

    try {
        const msg = await API.sendChat(txt);
        if (msg) {
            const myId = STATE.user?.id;
            const el = document.createElement('div');
            el.id = `msg-${msg.id}`;
            el.innerHTML = GRK.chatMessage(msg, msg.membro_id === myId);
            const area = document.getElementById('chatMessages');
            if (area) {
                area.appendChild(el);
                area.scrollTop = area.scrollHeight;
            }
            STATE.chatLastTs = msg.created_at;
        }
    } catch (e) {
        GRK.toast('Erro ao enviar mensagem', 'error');
    }
}

async function carregarParticipantes() {
    const list = document.getElementById('participantsList');
    if (!list) return;

    try {
        const membros = await API.getMembros();
        if (!membros?.length) {
            list.innerHTML = GRK.emptyState('ri-group-line', 'Nenhum membro', '');
            return;
        }
        list.innerHTML = membros.filter(m => m.cargo !== 'Pendente').map(m => `
            <div class="participant-item" data-id="${m.id}">
                <div class="avatar avatar-sm">${GRK.getInitials(m.nick)}</div>
                <div class="participant-info">
                    <div class="participant-nick">${escapeHtml(m.nick)}</div>
                    <div class="participant-cargo">${m.cargo || '—'}</div>
                </div>
                <div class="participant-level">Nv ${m.nivel || 1}</div>
            </div>
        `).join('');

        // Click para ver perfil
        list.querySelectorAll('.participant-item').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo('membroPerfil', { membroId: item.dataset.id });
            });
        });
    } catch (e) { /* silencioso */ }
}

/* ═══════════════════════════════════════════════════════════
   DMs
═══════════════════════════════════════════════════════════ */
async function carregarDMs() {
    const list = document.getElementById('dmList');
    if (!list) return;
    list.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);

    try {
        const convs = await API.getDMs();
        STATE.dmList = convs;

        if (!convs?.length) {
            list.innerHTML = GRK.emptyState('ri-message-3-line', 'Nenhuma conversa', 'Inicie uma conversa com um membro da facção');
            return;
        }

        list.innerHTML = convs.map(c => `
            <div class="dm-item" data-conv-id="${c.id}" data-nick="${escapeHtml(c.outro_nick || '')}">
                <div class="avatar avatar-md dm-item-avatar">${GRK.getInitials(c.outro_nick || '?')}</div>
                <div class="dm-item-info">
                    <div class="dm-item-nick">${escapeHtml(c.outro_nick || '—')}</div>
                    <div class="dm-item-preview">${escapeHtml((c.ultima_msg || 'Sem mensagens').slice(0, 50))}</div>
                </div>
                <div class="dm-item-meta">
                    <div class="dm-item-time">${c.ultima_msg_ts ? GRK.timeAgo(c.ultima_msg_ts) : ''}</div>
                    ${Number(c.nao_lidas) > 0 ? `<span class="dm-item-unread">${c.nao_lidas}</span>` : ''}
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.dm-item').forEach(item => {
            item.addEventListener('click', () => {
                const convId = item.dataset.convId;
                const nick   = item.dataset.nick;
                navigateTo('dmConversa', { conversaId: convId, titulo: nick });
            });
        });
    } catch (e) {
        list.innerHTML = GRK.emptyState('ri-wifi-off-line', 'Erro ao carregar', 'Não foi possível carregar as mensagens');
    }
}

async function entrarNaConversa(conversaId, titulo = '') {
    activeConversaId = conversaId;
    setTextById('topbarTitle', titulo || 'Conversa');

    const msgArea = document.getElementById('dmMessages');
    if (!msgArea) return;
    msgArea.innerHTML = '<div class="chat-loading"><div class="chat-spinner"></div></div>';

    try {
        const msgs = await API.getDMMsgs(conversaId);
        STATE.dmMsgs[conversaId]   = msgs;
        STATE.dmLastTs[conversaId] = msgs.length ? msgs[msgs.length - 1].created_at : null;
        renderizarDMMsgs(conversaId, msgs, true);
    } catch (e) {
        msgArea.innerHTML = GRK.emptyState('ri-wifi-off-line', 'Sem conexão', 'Não foi possível carregar as mensagens');
    }

    pararDMPolling();
    dmPollTimer = setInterval(() => pollDM(conversaId), DM_POLL_MS);
}

async function pollDM(conversaId) {
    if (currentView !== 'dmConversa' || activeConversaId !== conversaId) { pararDMPolling(); return; }
    try {
        const since = STATE.dmLastTs[conversaId];
        const novas = await API.getDMMsgs(conversaId, since);
        if (novas?.length) {
            STATE.dmLastTs[conversaId] = novas[novas.length - 1].created_at;
            renderizarDMMsgs(conversaId, novas, false);
        }
    } catch (e) { /* silencioso */ }
}

function pararDMPolling() {
    if (dmPollTimer) { clearInterval(dmPollTimer); dmPollTimer = null; }
}

function renderizarDMMsgs(conversaId, msgs, clear = false) {
    const area = document.getElementById('dmMessages');
    if (!area) return;
    const atBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 100;

    if (clear) area.innerHTML = '';
    if (clear && !msgs.length) {
        area.innerHTML = GRK.emptyState('ri-message-3-line', 'Nenhuma mensagem', 'Diga olá!');
        return;
    }

    const myId = STATE.user?.id;
    msgs.forEach(msg => {
        if (document.getElementById(`dm-${msg.id}`)) return;
        const isMe = msg.remetente_id === myId;
        const el = document.createElement('div');
        el.id = `dm-${msg.id}`;
        el.innerHTML = GRK.chatMessage(msg, isMe);
        area.appendChild(el);
    });

    if (clear || atBottom) area.scrollTop = area.scrollHeight;
}

async function enviarDMMsg() {
    if (!activeConversaId) return;
    const input = document.getElementById('dmInput');
    const txt   = input?.value?.trim();
    if (!txt) return;

    input.value = '';
    input.style.height = 'auto';

    try {
        const msg = await API.sendDM(activeConversaId, txt);
        if (msg) {
            const el = document.createElement('div');
            el.id = `dm-${msg.id}`;
            el.innerHTML = GRK.chatMessage(msg, true);
            const area = document.getElementById('dmMessages');
            if (area) { area.appendChild(el); area.scrollTop = area.scrollHeight; }
            STATE.dmLastTs[activeConversaId] = msg.created_at;
        }
    } catch (e) {
        GRK.toast('Erro ao enviar mensagem', 'error');
    }
}

/* ═══════════════════════════════════════════════════════════
   MISSÕES
═══════════════════════════════════════════════════════════ */
let todosEventosTarefas = [];
let pendingIAParsed = null;

async function carregarMissoes() {
    const tabT = document.getElementById('tabTarefas');
    const tabE = document.getElementById('tabEventos');
    if (tabT) tabT.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);
    if (tabE) tabE.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);

    try {
        todosEventosTarefas = await API.getEventos() || [];
        
        const tarefas = todosEventosTarefas.filter(e => e.tipo === 'tarefa');
        const eventos = todosEventosTarefas.filter(e => e.tipo === 'evento');

        if (tabT) {
            if (tarefas.length === 0) {
                tabT.innerHTML = '<div class="empty-state"><i class="ri-sword-line"></i><p>Nenhuma tarefa cadastrada</p></div>';
            } else {
                tabT.innerHTML = tarefas.map(t => `
                    <div class="card">
                        <div class="card-title">${escapeHtml(t.titulo)}</div>
                        <div style="font-size: 0.85rem; color: var(--text-2); margin-top: 5px;">
                            Meta Diária: ${t.meta_diaria > 0 ? t.meta_diaria : 'N/A'}<br>
                            Meta Mensal: ${t.meta_mensal > 0 ? t.meta_mensal : 'N/A'}
                        </div>
                        ${STATE.user.is_admin ? `<button class="btn btn-ghost" style="margin-top:10px;" onclick="excluirEvTar('${t.id}')">Excluir</button>` : ''}
                    </div>
                `).join('');
            }
        }

        if (tabE) {
            if (eventos.length === 0) {
                tabE.innerHTML = '<div class="empty-state"><i class="ri-calendar-event-line"></i><p>Nenhum evento agendado</p></div>';
            } else {
                tabE.innerHTML = eventos.map(e => `
                    <div class="card">
                        <div class="card-title">${escapeHtml(e.titulo)} <span style="font-size:0.75rem; background: var(--red); padding: 2px 6px; border-radius: 4px;">${e.horarios.length} horários</span></div>
                        <div style="margin-top: 10px; display: grid; gap: 8px;">
                            ${e.horarios.map(h => `
                                <div style="display: flex; gap: 10px; align-items: center; background: var(--bg-card2); padding: 6px 10px; border-radius: 6px;">
                                    <span style="color: var(--gold); font-weight: bold; font-family: var(--ff-title); letter-spacing: 1px;">${h.horario}</span>
                                    <span style="font-size: 0.85rem;">${escapeHtml(h.descricao)}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${STATE.user.is_admin ? `<button class="btn btn-ghost" style="margin-top:10px;" onclick="excluirEvTar('${e.id}')">Excluir Grupo</button>` : ''}
                    </div>
                `).join('');
            }
        }

    } catch (e) {
        if (tabT) tabT.innerHTML = '<div class="form-error">Erro ao carregar</div>';
        if (tabE) tabE.innerHTML = '';
        console.error(e);
    }
}

window.excluirEvTar = async (id) => {
    if(!confirm('Certeza que deseja excluir?')) return;
    try {
        await API.excluirEvento(id);
        GRK.toast('Excluído com sucesso');
        carregarMissoes();
    } catch(e) {
        GRK.toast(e.message, 'error');
    }
}

async function carregarConquistas() {
    try {
        const conquistas = await API.getConquistas();
        const mapa       = Object.fromEntries((conquistas || []).map(c => [c.tipo, c.nick_vencedor]));

        const grid = document.getElementById('achievementsGrid');
        if (!grid) return;

        grid.innerHTML = Object.entries(CONQUISTAS_DEF).map(([key, def]) => {
            const vencedor  = mapa[key];
            const desbloq   = !!vencedor;
            return `
                <div class="achievement-card ${desbloq ? 'achievement-unlocked' : 'achievement-locked'}"
                     data-ach="${key}">
                    <div class="achievement-icon">${def.icon}</div>
                    <div class="achievement-name">${def.nome}</div>
                    <div class="achievement-req">${vencedor ? escapeHtml(vencedor) : def.req}</div>
                    ${!desbloq ? '<div class="achievement-lock-icon"><i class="ri-lock-line"></i></div>' : ''}
                </div>
            `;
        }).join('');

        // Click para modal
        grid.querySelectorAll('.achievement-card').forEach(card => {
            card.addEventListener('click', () => {
                const key    = card.dataset.ach;
                const def    = CONQUISTAS_DEF[key];
                const desbloq = card.classList.contains('achievement-unlocked');
                const vencedor = mapa[key];

                setTextById('achModalIcon', def.icon);
                setTextById('achModalName', def.nome);
                setTextById('achModalDesc',  def.desc);

                const winnerEl = document.getElementById('achModalWinner');
                const lockedEl = document.getElementById('achModalLocked');
                if (desbloq && vencedor) {
                    winnerEl?.classList.remove('hidden');
                    lockedEl?.classList.add('hidden');
                    setTextById('achModalWinnerNick', vencedor);
                } else {
                    winnerEl?.classList.add('hidden');
                    lockedEl?.classList.remove('hidden');
                }

                showEl('achievementModal');
            });
        });

        // Admin: preencher painel de conquistas admin
        preencherConquistasAdmin(mapa);

    } catch (e) {
        const grid = document.getElementById('achievementsGrid');
        if (grid) grid.innerHTML = GRK.emptyState('ri-wifi-off-line', 'Erro', 'Não foi possível carregar conquistas');
    }
}

function preencherConquistasAdmin(mapa) {
    const list = document.getElementById('conquistasAdminList');
    if (!list || !STATE.user?.is_admin) return;

    list.innerHTML = Object.entries(CONQUISTAS_DEF).map(([key, def]) => `
        <div class="conquista-admin-item">
            <div class="conquista-admin-icon">${def.icon}</div>
            <div class="conquista-admin-info">
                <div class="conquista-admin-nome">${def.nome}</div>
            </div>
            <input type="text" class="input-field conquista-admin-input" data-tipo="${key}"
                   placeholder="Nick do vencedor" value="${escapeHtml(mapa[key] || '')}">
        </div>
    `).join('');
}

/* ═══════════════════════════════════════════════════════════
   PERFIL
═══════════════════════════════════════════════════════════ */
async function carregarPerfil() {
    try {
        const me = await API.getMe();
        STATE.setUser(me);
        atualizarUIUsuario();
        verificarLembrete();
    } catch (e) { /* usa dados em cache */ }
}

async function carregarMembroPerfil(membroId) {
    setAvatarEl(document.getElementById('membroAvatar'), '...', null);

    try {
        const membros = await API.getMembros();
        const ranking = STATE.ranking?.length ? STATE.ranking : await API.getRanking();
        const membro  = membros?.find(m => m.id === membroId);
        if (!membro) { GRK.toast('Membro não encontrado', 'error'); return; }

        const pos = ranking.findIndex(r => r.id === membroId);

        setAvatarEl(document.getElementById('membroAvatar'), membro.nick, membro.avatar_url);
        setTextById('membroNick',    membro.nick   || '—');
        setTextById('membroCargo',   membro.cargo  || '—');
        setTextById('membroLevel',  `NÍVEL ${membro.nivel || 1}`);
        setTextById('membroRanking', pos >= 0 ? `#${pos + 1}` : '—');
        setTextById('membroPontos',  GRK.formatPts(membro.pontos || 0));
        setTextById('membroNivelAK', membro.nivel_ak || '—');
        setTextById('membroMissoes', '—');

        // Bio
        if (membro.bio) {
            setTextById('membroBio', membro.bio);
            document.getElementById('membroBioWrap')?.classList.remove('hidden');
        }

        // Botão DM
        const dmBtn = document.getElementById('membroDMBtn');
        if (dmBtn) {
            dmBtn.onclick = async () => {
                try {
                    const r = await API.iniciarDM(membroId);
                    navigateTo('dmConversa', { conversaId: r.conversa_id, titulo: membro.nick });
                } catch (e) {
                    GRK.toast('Erro ao iniciar conversa', 'error');
                }
            };
        }
    } catch (e) {
        GRK.toast('Erro ao carregar perfil', 'error');
    }
}

function verificarLembrete() {
    const u = STATE.user;
    if (!u) return;
    const reminder = document.getElementById('levelReminder');
    const title    = document.getElementById('levelReminderTitle');
    if (!reminder) return;

    const nivelDiff   = (u.nivel || 1)    !== (u.nivel_notificado || 1);
    const akDiff      = (u.nivel_ak || 1) !== (u.nivel_ak_notificado || 1);

    if (nivelDiff || akDiff) {
        const msg = nivelDiff ? 'Você subiu de nível! Atualize aqui.' : 'Sua AK subiu de nível! Atualize aqui.';
        if (title) title.textContent = msg;
        reminder.classList.remove('hidden');
    } else {
        reminder.classList.add('hidden');
    }
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICAÇÕES
═══════════════════════════════════════════════════════════ */
async function iniciarPollingNotificacoes() {
    await carregarContadorNotif();
    notifPollTimer = setInterval(carregarContadorNotif, NOTIF_POLL_MS);
}

async function carregarContadorNotif() {
    try {
        const notifs   = await API.getNotificacoes();
        const naoLidas = notifs?.filter(n => !n.lida)?.length || 0;
        STATE.notifCount = naoLidas;

        // Dot
        const dot = document.getElementById('notifDot');
        if (dot) dot.classList.toggle('hidden', naoLidas === 0);

        // Pré-popular painel
        if (document.getElementById('notifLista')) {
            atualizarNotifPanel(notifs?.slice(0, 8) || []);
        }
    } catch (e) { /* silencioso */ }
}

function atualizarNotifPanel(notifs) {
    const lista = document.getElementById('notifLista');
    if (!lista) return;
    if (!notifs.length) {
        lista.innerHTML = GRK.emptyState('ri-notification-off-line', 'Sem notificações', '');
        return;
    }
    lista.innerHTML = notifs.map(n => `
        <div class="notif-item ${!n.lida ? 'notif-item-unread' : ''}" data-notif-id="${n.id}">
            <div class="notif-item-icon">${notifIcon(n.tipo)}</div>
            <div class="notif-item-info">
                <div class="notif-item-title">${escapeHtml(n.titulo)}</div>
                <div class="notif-item-msg">${escapeHtml(n.mensagem)}</div>
                <div class="notif-item-time">${GRK.timeAgo(n.created_at)}</div>
            </div>
        </div>
    `).join('');

    lista.querySelectorAll('[data-notif-id]').forEach(item => {
        item.addEventListener('click', async () => {
            await API.lerNotificacoes(item.dataset.notifId).catch(() => {});
            item.classList.remove('notif-item-unread');
        });
    });
}

async function carregarNotificacoes() {
    const lista = document.getElementById('notifFullList');
    if (!lista) return;
    lista.innerHTML = '<div class="skeleton-card"></div>'.repeat(4);

    try {
        const notifs = await API.getNotificacoes();
        await API.lerNotificacoes().catch(() => {});
        STATE.notifCount = 0;
        document.getElementById('notifDot')?.classList.add('hidden');

        if (!notifs?.length) {
            lista.innerHTML = GRK.emptyState('ri-notification-off-line', 'Sem notificações', 'Suas notificações aparecem aqui');
            return;
        }

        lista.innerHTML = notifs.map(n => `
            <div class="notif-item ${!n.lida ? 'notif-item-unread' : ''}">
                <div class="notif-item-icon">${notifIcon(n.tipo)}</div>
                <div class="notif-item-info">
                    <div class="notif-item-title">${escapeHtml(n.titulo)}</div>
                    <div class="notif-item-msg">${escapeHtml(n.mensagem)}</div>
                    <div class="notif-item-time">${GRK.timeAgo(n.created_at)}</div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        lista.innerHTML = GRK.emptyState('ri-wifi-off-line', 'Erro', 'Não foi possível carregar notificações');
    }
}

function notifIcon(tipo) {
    const icons = {
        tarefa:   '🎯', evento: '📅', pvp: '⚔️',
        promocao: '🎖️', denuncia: '🚨', nivel: '⬆️',
        ak: '🔫', geral: '🔔'
    };
    return icons[tipo] || '🔔';
}

/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÕES
═══════════════════════════════════════════════════════════ */
function carregarConfig() {
    // Push status
    const pushText = document.getElementById('pushStatusText');
    const pushBtn  = document.getElementById('pushToggle');

    if ('Notification' in window) {
        const perm = Notification.permission;
        if (pushText) pushText.textContent = perm === 'granted' ? 'Ativo' : 'Inativo';
        if (pushBtn)  pushBtn.classList.toggle('toggle-on', perm === 'granted');
    } else {
        if (pushText) pushText.textContent = 'Não suportado';
    }
}

/* ═══════════════════════════════════════════════════════════
   ADMIN
═══════════════════════════════════════════════════════════ */
async function carregarAdmin() {
    await carregarAdminMembros();
    preencherConquistasAdmin({});
}


async function carregarAprovacoes() {
    const list = document.getElementById('adminPendentesList');
    if (!list) return;
    list.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);

    try {
        // Aproveitar que API.getMembros traz todos os ativos (os pendentes sao ativos)
        const membros = await API.getMembros();
        const pendentes = membros.filter(m => m.cargo === 'Pendente');

        if (!pendentes.length) {
            list.innerHTML = GRK.emptyState('ri-shield-check-line', 'Nenhum membro pendente', '');
            return;
        }

        list.innerHTML = pendentes.map(m => `
            <div class="admin-member-row">
                <div class="avatar avatar-sm">${GRK.getInitials(m.nick)}</div>
                <div class="admin-member-info">
                    <div class="admin-member-nick">${escapeHtml(m.nick)}</div>
                    <div class="admin-member-cargo" style="color: var(--gold);">Aguardando Aprova\u00e7\u00e3o</div>
                </div>
                <div class="admin-member-actions">
                    <button class="btn btn-primary btn-xs btn-aprovar" data-id="${m.id}" data-nick="${escapeHtml(m.nick)}">
                        Aprovar
                    </button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.btn-aprovar').forEach(btn => {
            btn.addEventListener('click', () => {
                const nick = btn.dataset.nick;
                const id = btn.dataset.id;
                document.getElementById('promoverId').value = id;
                document.getElementById('promoverCargo').value = 'Recruta'; // Default
                document.getElementById('promoverMotivo').value = 'Aprova\u00e7\u00e3o inicial';
                setTextById('promoverNickDisplay', nick);
                showEl('modalPromover');
            });
        });

    } catch (e) {
        list.innerHTML = GRK.emptyState('ri-error-warning-line', 'Erro ao carregar', '');
    }
}

async function carregarAdminMembros() {
    const list = document.getElementById('adminMembersList');
    if (!list) return;
    list.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);

    try {
        const membros = await API.getMembros();
        if (!membros?.length) {
            list.innerHTML = GRK.emptyState('ri-group-line', 'Nenhum membro', '');
            return;
        }
        list.innerHTML = membros.filter(m => m.cargo !== 'Pendente').map(m => `
            <div class="admin-member-row">
                <div class="avatar avatar-sm">${GRK.getInitials(m.nick)}</div>
                <div class="admin-member-info">
                    <div class="admin-member-nick">${escapeHtml(m.nick)}</div>
                    <div class="admin-member-cargo">${m.cargo || '—'} · Nv${m.nivel} · ${GRK.formatPts(m.pontos)} pts</div>
                </div>
                <div class="admin-member-actions">
                    <button class="btn btn-ghost btn-xs btn-ver-senha" data-id="${m.id}" data-nick="${escapeHtml(m.nick)}">
                        Ver
                    </button>
                    <button class="btn btn-ghost btn-xs btn-resetar-senha" data-id="${m.id}" data-nick="${escapeHtml(m.nick)}">
                        Reset
                    </button>
                    <button class="btn btn-ghost btn-xs btn-promover" data-id="${m.id}" data-nick="${escapeHtml(m.nick)}">
                        Cargo
                    </button>
                </div>
            </div>
        `).join('');

        // Ver Senha
        let cacheSenhas = null;
        list.querySelectorAll('.btn-ver-senha').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!cacheSenhas) {
                    try {
                        cacheSenhas = await API.verSenhas();
                    } catch (e) {
                        GRK.toast('Erro ao buscar senhas', 'error');
                        return;
                    }
                }
                const mSenha = cacheSenhas.find(x => x.id === btn.dataset.id);
                if (mSenha) {
                    GRK.modal('SENHA DO MEMBRO', `
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: var(--red);">${mSenha.senha}</div>
                        </div>
                    `, '<button class="btn btn-primary" onclick="document.querySelector(\'.modal-overlay.visible\')?.classList.remove(\'visible\')">FECHAR</button>');
                }
            });
        });

        // Resetar Senha
        list.querySelectorAll('.btn-resetar-senha').forEach(btn => {
            btn.addEventListener('click', async () => {
                GRK.confirm(`Resetar Senha de ${btn.dataset.nick}?`, async () => {
                    try {
                        const r = await API.resetarSenha(btn.dataset.id);
                        GRK.toast(`Nova senha de ${btn.dataset.nick}: ${r.senha}`, 'success');
                        mostrarSenhaGerada(btn.dataset.nick, r.senha);
                    } catch (e) {
                        GRK.toast('Erro ao resetar PIN', 'error');
                    }
                });
            });
        });

        // Promover
        list.querySelectorAll('.btn-promover').forEach(btn => {
            btn.addEventListener('click', () => {
                const cargoAtual = membros.find(m => m.id === btn.dataset.id)?.cargo;
                promoverModal(btn.dataset.id, btn.dataset.nick, cargoAtual);
            });
        });

        // Preencher pontuar select
        const pontuarList = document.getElementById('pontuarMemberSelect');
        if (pontuarList) {
            pontuarList.innerHTML = membros.map(m => `
                <div class="pontuar-member-item" data-id="${m.id}" data-nick="${escapeHtml(m.nick)}">
                    <div class="avatar avatar-sm">${GRK.getInitials(m.nick)}</div>
                    <div class="pontuar-member-nick">${escapeHtml(m.nick)}</div>
                    <div class="pontuar-member-pts">${GRK.formatPts(m.pontos)} pts</div>
                </div>
            `).join('');
            pontuarList.querySelectorAll('.pontuar-member-item').forEach(item => {
                item.addEventListener('click', () => {
                    pontuarList.querySelectorAll('.pontuar-member-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    pontuarSelectedId = item.dataset.id;
                });
            });
        }
    } catch (e) {
        list.innerHTML = GRK.emptyState('ri-wifi-off-line', 'Erro', 'Não foi possível carregar membros');
    }
}

function mostrarSenhaGerada(nick, senha) {
    const box = document.getElementById('senhaGeradaBox');
    if (!box) return;
    setTextById('senhaGeradaNick', nick);
    setTextById('senhaGeradaValor', senha);
    box.classList.remove('hidden');
    // Mudar para aba "criar" onde está a box
    document.querySelector('[data-admin-tab="criar"]')?.click();
}

function promoverModal(membroId, nick, cargoAtual) {
    const cargos = ['Recruta','Membro','Veterano','Oficial','Tenente','Gerente','Lider'];
    const options = cargos.map(c => `<option value="${c}" ${c === cargoAtual ? 'selected' : ''}>${c}</option>`).join('');
    const content = `
        <label class="form-label">Novo cargo para <strong>${escapeHtml(nick)}</strong></label>
        <div class="select-field-wrap">
            <select id="promoverCargoSelect" class="select-field">${options}</select>
        </div>
        <div class="input-field-wrap mt-1">
            <i class="ri-chat-1-line"></i>
            <input type="text" id="promoverMotivo" class="input-field" placeholder="Motivo da promoção">
        </div>
    `;
    const fecharModal = GRK.modal('PROMOVER MEMBRO', content, `
        <button class="btn btn-ghost" onclick="document.querySelector('.modal-overlay.visible')?.classList.remove('visible')">Cancelar</button>
        <button class="btn btn-primary" id="confirmarPromoverBtn">CONFIRMAR</button>
    `);

    document.getElementById('confirmarPromoverBtn')?.addEventListener('click', async () => {
        const cargo  = document.getElementById('promoverCargoSelect')?.value;
        const motivo = document.getElementById('promoverMotivo')?.value?.trim();
        if (!motivo) { GRK.toast('Informe o motivo', 'error'); return; }
        try {
            await API.promover(membroId, cargo, motivo);
            GRK.toast(`${nick} promovido(a) para ${cargo}! 🎖️`, 'success');
            fecharModal();
            carregarAdminMembros();
        } catch (e) {
            GRK.toast('Erro ao promover membro', 'error');
        }
    });
}

/* ═══════════════════════════════════════════════════════════
   EVENT LISTENERS GLOBAIS
═══════════════════════════════════════════════════════════ */
function inicializarEventListeners() {
    // ── Login Step 1 ──────────────────────────────────────
    const nickInput = document.getElementById('loginNickInput');
    if (nickInput) {
        nickInput.addEventListener('keydown', e => { if (e.key === 'Enter') loginStep1Submit(); });
    }
    document.getElementById('regEntrarBtn')?.addEventListener('click', registerSubmit);

    // ── Login Step 2 (Senha) ──────────────────────────────
    

    document.getElementById('loginEntrarBtn')?.addEventListener('click', loginStep1Submit);

    const senhaInput = document.getElementById('loginSenhaInput');
    if (senhaInput) {
        senhaInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('loginEntrarBtn')?.click();
        });
    }

    document.getElementById('loginLembrarCheck')?.addEventListener('change', e => {
        lembrar = e.target.checked;
    });

    // ── Navegação: Bottom nav + Sidebar nav ───────────────
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view) navigateTo(view);
        });
    });

    // Back button topbar
    document.getElementById('topbarBack')?.addEventListener('click', () => {
        const backMap = {
            conquistas:    'perfil',
            membroPerfil:  'ranking',
            notificacoes:  'home',
            config:        'perfil',
            admin:         'perfil',
            dmConversa:    'dm',
        };
        navigateTo(backMap[currentView] || 'home');
    });

    // ── Notificações dropdown ─────────────────────────────
    document.getElementById('notifBtn')?.addEventListener('click', () => {
        document.getElementById('notifPanel')?.classList.toggle('hidden');
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBtn')) {
            document.getElementById('notifPanel')?.classList.add('hidden');
        }
    });
    document.getElementById('notifLerTodas')?.addEventListener('click', async () => {
        await API.lerNotificacoes().catch(() => {});
        document.getElementById('notifDot')?.classList.add('hidden');
        await carregarContadorNotif();
    });

    // ── Chat ─────────────────────────────────────────────
    document.getElementById('chatSendBtn')?.addEventListener('click', enviarChatMsg);
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarChatMsg(); }
        });
        chatInput.addEventListener('input', autoResizeTextarea);
    }

    // Participants drawer
    document.getElementById('participantsToggle')?.addEventListener('click', () => {
        document.getElementById('participantsDrawer')?.classList.toggle('drawer-open');
    });
    document.getElementById('participantsClose')?.addEventListener('click', () => {
        document.getElementById('participantsDrawer')?.classList.remove('drawer-open');
    });

    // Participants search
    document.getElementById('participantsSearch')?.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        document.querySelectorAll('.participant-item').forEach(item => {
            const nick = item.querySelector('.participant-nick')?.textContent?.toLowerCase() || '';
            item.style.display = nick.includes(q) ? '' : 'none';
        });
    });

    // ── DMs ─────────────────────────────────────────────
    document.getElementById('dmSendBtn')?.addEventListener('click', enviarDMMsg);
    const dmInput = document.getElementById('dmInput');
    if (dmInput) {
        dmInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarDMMsg(); }
        });
        dmInput.addEventListener('input', autoResizeTextarea);
    }

    // Nova DM modal
    document.getElementById('novaDMBtn')?.addEventListener('click', () => {
        showEl('novaDMModal');
        document.getElementById('dmSearchInput')?.focus();
        carregarMembrosParaDM();
    });
    document.getElementById('novaDMClose')?.addEventListener('click', () => hideEl('novaDMModal'));
    document.getElementById('dmSearchInput')?.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        document.querySelectorAll('.dm-search-result').forEach(item => {
            const nick = item.dataset.nick?.toLowerCase() || '';
            item.style.display = nick.includes(q) ? '' : 'none';
        });
    });

    // ── Missões tabs ─────────────────────────────────────
    document.querySelectorAll('[data-missions-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-missions-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.missionsTab;
            document.getElementById('missionsDisponiveis')?.classList.toggle('hidden', tab !== 'disponiveis');
            document.getElementById('missionsConcluidas')?.classList.toggle('hidden', tab !== 'concluidas');
        });
    });

    // Criar missão (admin)
    document.getElementById('missionCreateBtn')?.addEventListener('click', async () => {
        const titulo  = document.getElementById('missionTitulo')?.value?.trim();
        const desc    = document.getElementById('missionDesc')?.value?.trim();
        const pontos  = parseInt(document.getElementById('missionPontos')?.value || '0');
        if (!titulo) { GRK.toast('Informe o título', 'error'); return; }
        if (!desc)   { GRK.toast('Informe a descrição', 'error'); return; }
        try {
            await API.criarTarefa(titulo, desc, pontos);
            GRK.toast('Missão criada! 🎯', 'success');
            document.getElementById('missionTitulo').value = '';
            document.getElementById('missionDesc').value   = '';
            document.getElementById('missionPontos').value = '';
            carregarMissoes();
        } catch (e) {
            GRK.toast(e.message || 'Erro ao criar missão', 'error');
        }
    });

    // ── Conquistas modal fechar ───────────────────────────
    document.getElementById('achievementModalClose')?.addEventListener('click', () => hideEl('achievementModal'));
    document.getElementById('achievementModal')?.addEventListener('click', e => {
        if (e.target.id === 'achievementModal') hideEl('achievementModal');
    });

    // ── Perfil ───────────────────────────────────────────
    document.getElementById('perfilEditarBtn')?.addEventListener('click', () => {
        const u = STATE.user;
        const el = id => document.getElementById(id);
        if (el('editNivel'))   el('editNivel').value   = u?.nivel    || 1;
        if (el('editNivelAK')) el('editNivelAK').value = u?.nivel_ak || 1;
        if (el('editBio'))     el('editBio').value     = u?.bio      || '';
        showEl('editPerfilModal');
    });
    document.getElementById('editPerfilClose')?.addEventListener('click',    () => hideEl('editPerfilModal'));
    document.getElementById('editPerfilCancelBtn')?.addEventListener('click', () => hideEl('editPerfilModal'));
    document.getElementById('editPerfilSaveBtn')?.addEventListener('click', async () => {
        const nivel    = parseInt(document.getElementById('editNivel')?.value    || '1');
        const nivel_ak = parseInt(document.getElementById('editNivelAK')?.value || '1');
        const bio      = document.getElementById('editBio')?.value?.trim() || '';
        
        const senhaAtual = document.getElementById('editSenhaAtual')?.value;
        const senhaNova  = document.getElementById('editSenhaNova')?.value;

        try {
            if (senhaAtual && senhaNova) {
                await API.alterarSenha(senhaAtual, senhaNova);
                document.getElementById('editSenhaAtual').value = '';
                document.getElementById('editSenhaNova').value = '';
            }

            const updated = await API.updateMe({ nivel, nivel_ak, bio });
            STATE.setUser({ ...STATE.user, ...updated });
            atualizarUIUsuario();
            hideEl('editPerfilModal');
            GRK.toast('Perfil atualizado! ✅', 'success');
            verificarLembrete();
        } catch (e) {
            GRK.toast(e.message || 'Erro ao salvar', 'error');
        }
    });

    // Lembrete de nível
    document.getElementById('levelReminderBtn')?.addEventListener('click', () => {
        document.getElementById('perfilEditarBtn')?.click();
    });
    document.getElementById('levelReminderClose')?.addEventListener('click', () => {
        document.getElementById('levelReminder')?.classList.add('hidden');
    });

    // Avatar upload
    document.getElementById('perfilAvatarEdit')?.addEventListener('click', () => {
        document.getElementById('avatarFileInput')?.click();
    });
    document.getElementById('avatarFileInput')?.addEventListener('change', async function() {
        const file = this.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            GRK.toast('Funcionalidade de avatar em desenvolvimento', 'info');
        };
        reader.readAsDataURL(file);
    });

    // Logout
    document.getElementById('sidebarLogout')?.addEventListener('click', fazerLogout);
    document.getElementById('perfilLogoutBtn')?.addEventListener('click', fazerLogout);
    document.getElementById('configSairBtn')?.addEventListener('click', fazerLogout);

    // Config: push toggle
    document.getElementById('pushToggle')?.addEventListener('click', async () => {
        if (window.PWA) {
            try {
                await PWA.solicitarPermissaoPush();
                GRK.toast('Notificações ativadas! 🔔', 'success');
                carregarConfig();
            } catch (e) {
                GRK.toast('Permissão negada', 'error');
            }
        }
    });

    // Config: editar perfil
    document.getElementById('configEditarPerfil')?.addEventListener('click', () => {
        navigateTo('perfil');
        setTimeout(() => document.getElementById('perfilEditarBtn')?.click(), 300);
    });
    document.getElementById('configAlterarNivel')?.addEventListener('click', () => {
        navigateTo('perfil');
        setTimeout(() => document.getElementById('perfilEditarBtn')?.click(), 300);
    });
    document.getElementById('configInstalarPWA')?.addEventListener('click', () => {
        document.getElementById('btnInstalarPWA')?.click();
    });

    // ── Admin Tabs ────────────────────────────────────────
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-admin-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.adminTab;
            ['membros', 'criar', 'pontuar', 'conquistas'].forEach(t => {
                const el = document.getElementById(`adminTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
                el?.classList.toggle('hidden', t !== tab);
            });
            if (tab === 'membros') carregarAdminMembros();
        if (tab === 'aprovacoes') carregarAprovacoes();
        });
    });

    // Admin: criar membro
    document.getElementById('adminCriarBtn')?.addEventListener('click', async () => {
        const nick  = document.getElementById('adminNovoNick')?.value?.trim();
        const cargo = document.getElementById('adminNovoCargo')?.value;
        if (!nick) { GRK.toast('Informe o nick', 'error'); return; }
        try {
            const r = await API.criarMembro(nick, cargo);
            mostrarSenhaGerada(r.membro?.nick || nick, r.senha || r.pin); // API returns pin for now, but will change
            GRK.toast(`${nick} adicionado! Senha: ${r.senha || r.pin}`, 'success');
            document.getElementById('adminNovoNick').value = '';
        } catch (e) {
            GRK.toast(e.message || 'Erro ao criar membro', 'error');
        }
    });

    // Admin: copiar PIN/Senha
    document.getElementById('senhaGeradaCopiarBtn')?.addEventListener('click', () => {
        const pin = document.getElementById('senhaGeradaValor')?.textContent;
        navigator.clipboard?.writeText(pin || '').then(() => GRK.toast('Senha copiada!', 'success'));
    });

    // Admin: pontuar
    document.getElementById('pontuarBtn')?.addEventListener('click', async () => {
        if (!pontuarSelectedId) { GRK.toast('Selecione um membro', 'error'); return; }
        const pontos = parseInt(document.getElementById('pontuarValor')?.value || '0');
        const motivo = document.getElementById('pontuarMotivo')?.value?.trim();
        if (!pontos)  { GRK.toast('Informe a quantidade de pontos', 'error'); return; }
        if (!motivo)  { GRK.toast('Informe o motivo', 'error'); return; }
        try {
            await API.pontuar(pontuarSelectedId, pontos, motivo, pontuarAcao);
            GRK.toast(`Pontuação registrada! ${pontuarAcao === 'add' ? '+' : '-'}${pontos} pts`, 'success');
            document.getElementById('pontuarValor').value  = '';
            document.getElementById('pontuarMotivo').value = '';
            pontuarSelectedId = null;
            document.querySelectorAll('.pontuar-member-item').forEach(i => i.classList.remove('selected'));
        } catch (e) {
            GRK.toast(e.message || 'Erro ao pontuar', 'error');
        }
    });

    document.querySelectorAll('.pontuar-acao-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pontuar-acao-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pontuarAcao = btn.dataset.acao;
        });
    });

    // Admin: buscar nick para pontuar
    document.getElementById('pontuarNickSearch')?.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        document.querySelectorAll('.pontuar-member-item').forEach(item => {
            const nick = item.dataset.nick?.toLowerCase() || '';
            item.style.display = nick.includes(q) ? '' : 'none';
        });
    });

    // Admin: salvar conquistas
    document.getElementById('adminSalvarConquistasBtn')?.addEventListener('click', async () => {
        const obj = {};
        document.querySelectorAll('.conquista-admin-input').forEach(inp => {
            if (inp.value.trim()) obj[inp.dataset.tipo] = inp.value.trim();
        });
        try {
            await API.saveConquistas(obj);
            GRK.toast('Conquistas salvas! 🏆', 'success');
        } catch (e) {
            GRK.toast('Erro ao salvar conquistas', 'error');
        }
    });

    // Ranking tabs (visuais por enquanto — todos usam mesmo endpoint)
    document.querySelectorAll('[data-ranking-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-ranking-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Avatar click na topbar
    document.getElementById('topbarAvatar')?.addEventListener('click', () => navigateTo('perfil'));


    // MISSIONS TABS
    document.querySelectorAll('.missions-tabs .tab-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const t = e.target.dataset.missionsTab;
            document.querySelectorAll('.missions-tabs .tab-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('tabTarefas')?.classList.toggle('hidden', t !== 'tarefas');
            document.getElementById('tabEventos')?.classList.toggle('hidden', t !== 'eventos');
        });
    });

    // ADD TAREFA
    document.getElementById('btnSalvarTarefa')?.addEventListener('click', async () => {
        const titulo = document.getElementById('addTarefaTitulo').value.trim();
        const mD = parseInt(document.getElementById('addTarefaMetaDiaria').value || 0);
        const mM = parseInt(document.getElementById('addTarefaMetaMensal').value || 0);
        if(!titulo) return GRK.toast('Título obrigatório', 'error');
        
        try {
            await API.criarEvento({ titulo, tipo: 'tarefa', meta_diaria: mD, meta_mensal: mM });
            document.getElementById('modalAddTarefa').classList.remove('visible');
            document.getElementById('addTarefaTitulo').value = '';
            GRK.toast('Tarefa criada!');
            carregarMissoes();
        } catch(e) {
            GRK.toast(e.message, 'error');
        }
    });

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // ANALISAR EVENTO (IA)
    document.getElementById('btnAnalisarEvento')?.addEventListener('click', async () => {
        const txt = document.getElementById('addEventoTexto').value.trim();
        const fileInput = document.getElementById('addEventoImg');
        const file = fileInput.files?.[0];
        
        if(!txt && !file) return GRK.toast('Insira texto ou imagem', 'error');
        
        const btn = document.getElementById('btnAnalisarEvento');
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Analisando IA...';
        btn.disabled = true;

        try {
            let b64 = null;
            let mime = null;
            if(file) {
                b64 = await fileToBase64(file);
                mime = file.type;
            }
            
            const resultado = await API.parseEventosIA(txt, b64, mime);
            pendingIAParsed = resultado;
            
            document.getElementById('modalAddEvento').classList.remove('visible');
            document.getElementById('modalConfirmarEvento').classList.add('visible');
            document.getElementById('confirmEventoTitulo').value = resultado.titulo || 'Novo Evento';
            
            const prev = document.getElementById('previewHorarios');
            prev.innerHTML = (resultado.horarios || []).map(h => `<b>${h.hora}</b> - ${escapeHtml(h.descricao)}`).join('<br>');

        } catch(e) {
            GRK.toast(e.message, 'error');
        } finally {
            btn.innerHTML = '<i class="ri-magic-line"></i> Extrair Horários';
            btn.disabled = false;
        }
    });

    // CONFIRMAR EVENTO
    document.getElementById('btnSalvarEventoConfirmado')?.addEventListener('click', async () => {
        if(!pendingIAParsed) return;
        const titulo = document.getElementById('confirmEventoTitulo').value.trim();
        if(!titulo) return GRK.toast('Título obrigatório', 'error');
        
        try {
            await API.criarEvento({
                titulo: titulo,
                tipo: 'evento',
                horarios: pendingIAParsed.horarios || []
            });
            document.getElementById('modalConfirmarEvento').classList.remove('visible');
            GRK.toast('Evento agendado!', 'success');
            pendingIAParsed = null;
            carregarMissoes();
        } catch(e) {
            GRK.toast(e.message, 'error');
        }
    });

    // Modais: fechar clicando fora
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });
}

/* ═══════════════════════════════════════════════════════════
   LOGIN & REGISTRO FLOW
═══════════════════════════════════════════════════════════ */
document.getElementById('loginShowRegisterBtn')?.addEventListener('click', () => {
    hideEl('loginStep1');
    showEl('loginStep2');
});

document.getElementById('pinBackBtn')?.addEventListener('click', () => {
    hideEl('loginStep2');
    showEl('loginStep1');
});

async function loginStep1Submit() {
    const nick = document.getElementById('loginNickInput')?.value?.trim();
    const senha = document.getElementById('loginSenhaInput')?.value?.trim();
    const lembrarCheck = document.getElementById('loginLembrarCheck')?.checked || false;

    if (!nick || !senha) {
        mostrarErroLogin('step1', 'Preencha nick e senha');
        return;
    }
    ocultarErroLogin('step1');
    showEl('loginLoading');
    hideEl('loginStep1');

    try {
        const membro = await AUTH.login(nick, senha, lembrarCheck);
        STATE.setUser(membro);
        await iniciarApp();
    } catch (e) {
        hideEl('loginLoading');
        showEl('loginStep1');
        mostrarErroLogin('step1', e.message || 'Erro ao logar');
    }
}

async function registerSubmit() {
    const nick = document.getElementById('regNickInput')?.value?.trim();
    const senha = document.getElementById('regSenhaInput')?.value?.trim();

    if (!nick || !senha || nick.length < 2 || senha.length < 4) {
        mostrarErroLogin('step2', 'Nick válido e senha mínima de 4 caracteres');
        return;
    }
    ocultarErroLogin('step2');
    showEl('loginLoading');
    hideEl('loginStep2');

    try {
        const membro = await AUTH.registrar(nick, senha);
        STATE.setUser(membro);
        await iniciarApp();
    } catch (e) {
        hideEl('loginLoading');
        showEl('loginStep2');
        mostrarErroLogin('step2', e.message || 'Erro ao registrar');
    }
}

function mostrarErroLogin(step, msg) {
    const el = document.getElementById(`loginStep${step === 'step1' ? '1' : '2'}Error`);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function ocultarErroLogin(step) {
    const el = document.getElementById(`loginStep${step === 'step1' ? '1' : '2'}Error`);
    el?.classList.add('hidden');
}

/* ═══════════════════════════════════════════════════════════
   LOGOUT
═══════════════════════════════════════════════════════════ */
async function fazerLogout() {
    GRK.confirm('Deseja sair da sua conta?', async () => {
        clearInterval(chatPollTimer);
        clearInterval(dmPollTimer);
        clearInterval(notifPollTimer);
        await API.logout().catch(() => {});
        AUTH.logout();
        STATE.clear();
        hideEl('appShell');
        showEl('loginScreen');
        document.getElementById('loginNickInput').value = '';
        pinBuffer = '';
        document.getElementById('loginNickInput')?.focus();
        showEl('loginStep1');
        hideEl('loginStep2');
        hideEl('loginLoading');
    });
}

/* ═══════════════════════════════════════════════════════════
   HELPERS DE DM: BUSCAR MEMBROS
═══════════════════════════════════════════════════════════ */
async function carregarMembrosParaDM() {
    const results = document.getElementById('dmSearchResults');
    if (!results) return;
    results.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);

    try {
        const membros = await API.getMembros();
        const myId    = STATE.user?.id;
        results.innerHTML = membros
            .filter(m => m.id !== myId)
            .map(m => `
                <div class="dm-search-result" data-id="${m.id}" data-nick="${escapeHtml(m.nick)}">
                    <div class="avatar avatar-sm">${GRK.getInitials(m.nick)}</div>
                    <div class="dm-search-nick">${escapeHtml(m.nick)}</div>
                    <div class="dm-search-cargo">${m.cargo || ''}</div>
                </div>
            `).join('');

        results.querySelectorAll('.dm-search-result').forEach(item => {
            item.addEventListener('click', async () => {
                try {
                    const r = await API.iniciarDM(item.dataset.id);
                    hideEl('novaDMModal');
                    navigateTo('dmConversa', { conversaId: r.conversa_id, titulo: item.dataset.nick });
                } catch (e) {
                    GRK.toast('Erro ao iniciar conversa', 'error');
                }
            });
        });
    } catch (e) {
        results.innerHTML = GRK.emptyState('ri-wifi-off-line', 'Erro', 'Não foi possível buscar membros');
    }
}

/* ═══════════════════════════════════════════════════════════
   UTILITÁRIOS DOM
═══════════════════════════════════════════════════════════ */
function showEl(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function hideEl(id)  { document.getElementById(id)?.classList.add('hidden');    }
function setTextById(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setStyle(id, prop, val) { const el = document.getElementById(id); if (el) el.style[prop] = val; }
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function setAvatarEl(el, nick, avatarUrl, isMe = false) {
    if (!el) return;
    el.className = el.className.replace(/avatar-\w+/g, '').trim();
    if (isMe) el.classList.add('avatar-me');
    if (avatarUrl) {
        el.innerHTML = `<img src="${avatarUrl}" alt="${escapeHtml(nick)}" loading="lazy">`;
    } else {
        el.textContent = GRK.getInitials(nick || '?');
    }
}

function autoResizeTextarea(e) {
    const ta = e.target;
    ta.style.height = 'auto';
    const max = 120;
    ta.style.height = Math.min(ta.scrollHeight, max) + 'px';
    ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden';
}
