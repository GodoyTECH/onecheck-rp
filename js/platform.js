/**
 * GoddoY RK — Plataforma Oficial
 * platform.js — Lógica completa da plataforma
 * Modo Demo: localStorage | Modo Online: Supabase via Netlify Functions
 */

'use strict';

// ════════════════════════════════════════════════════════════
//  CONSTANTES & CONFIG
// ════════════════════════════════════════════════════════════

const SENHA_GANG   = 'godoy2025';        // senha padrão (admin pode trocar)
const SENHA_GERENTE = 'admin@grk2025';   // senha extra para cargo gerente/líder

const CARGO_HIERARQUIA = {
    'Recruta': 1, 'Membro': 2, 'Veterano': 3,
    'Oficial': 4, 'Tenente': 5, 'Gerente': 6, 'Lider': 7
};

const CARGO_EMOJI = {
    'Recruta': '🔴', 'Membro': '🟠', 'Veterano': '🟡',
    'Oficial': '🔵', 'Tenente': '🟣', 'Gerente': '⭐', 'Lider': '👑'
};

const TAREFAS_DEFAULT = [
    { id:'t1', nome:'Patrulha Noturna', desc:'Proteja o território da GoddoY RK durante a madrugada. Reporte qualquer invasão.', pts:500, dif:'facil' },
    { id:'t2', nome:'Coleta de Recursos', desc:'Colete materiais no mapa e entregue no QG. Missão básica de abastecimento.', pts:800, dif:'facil' },
    { id:'t3', nome:'Operação Silêncio', desc:'Infiltre-se em território rival e obtenha informações sem ser detectado.', pts:2000, dif:'dificil' },
    { id:'t4', nome:'Defesa do QG', desc:'Mantenha o QG protegido durante evento de invasão. Coordene com a equipe.', pts:1500, dif:'media' },
    { id:'t5', nome:'Treinamento de Recrutas', desc:'Treine pelo menos 3 novos membros nas regras e operações básicas da gangue.', pts:1200, dif:'media' },
    { id:'t6', nome:'Missão Elite: Dominação', desc:'Domine 5 pontos estratégicos do mapa em uma única sessão. Apenas para veteranos.', pts:5000, dif:'elite' }
];

const RECOMPENSAS_DEFAULT = [
    { icon:'🏆', nome:'Líder da Temporada', req:'1º no ranking ao fim da temporada', pts:'10.000 pts + tag exclusiva' },
    { icon:'💎', nome:'Diamante da Rua', req:'Acumular 50.000 pts na temporada', pts:'Skin exclusiva + cargo Veterano' },
    { icon:'🔫', nome:'Atirador de Ouro', req:'Completar 10 missões difíceis', pts:'5.000 pts + conquista especial' },
    { icon:'🛡️', nome:'Guardião do QG', req:'Participar de 20 defesas de território', pts:'3.000 pts + medalha' },
    { icon:'⭐', nome:'Leal da Temporada', req:'Estar online por 30 dias consecutivos', pts:'2.000 pts + cargo Veterano' },
    { icon:'👑', nome:'MVP da Gangue', req:'Ter mais pts de missão que qualquer outro membro', pts:'Promoção automática + recompensa especial' }
];

// ════════════════════════════════════════════════════════════
//  ESTADO
// ════════════════════════════════════════════════════════════
let SESSAO = null;    // {nick, cargo, isAdmin, isLider}
let chatPollInterval  = null;
let chatMsgIds        = new Set();
let isGravando        = false;
let mediaRec          = null;
let audioChunks       = [];
let recTimerInterval  = null;
let recSec            = 0;

// ════════════════════════════════════════════════════════════
//  STORAGE HELPERS
// ════════════════════════════════════════════════════════════
function ls(k, def = null) {
    try { const v = localStorage.getItem('grk_' + k); return v ? JSON.parse(v) : def; } catch { return def; }
}
function lsSet(k, v) {
    try { localStorage.setItem('grk_' + k, JSON.stringify(v)); } catch {}
}
function lsPush(k, item, maxLen = 500) {
    const arr = ls(k, []);
    arr.push(item);
    if (arr.length > maxLen) arr.splice(0, arr.length - maxLen);
    lsSet(k, arr);
}

// ════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ════════════════════════════════════════════════════════════
function now() { return Date.now(); }
function horaStr(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function dataHora(ts) {
    return new Date(ts).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function iniciais(nick) {
    const p = (nick || '?').split(' ');
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase().slice(0,3);
}
function sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
function toast(msg, tipo = '') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast visible ' + tipo;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('visible'), 3000);
}

function chipClass(codigo) {
    if (codigo === 'ALERT-7') return 'rm-chip rm-chip-alert';
    if (codigo.startsWith('RP-'))    return 'rm-chip rm-chip-rp';
    if (codigo.startsWith('COND-'))  return 'rm-chip rm-chip-cond';
    if (codigo.startsWith('CONTA-')) return 'rm-chip rm-chip-conta';
    return 'rm-chip rm-chip-rp';
}

// ════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════
function initLogin() {
    const btnEntrar = document.getElementById('btnEntrar');
    const btnEye    = document.getElementById('btnEye');
    const inpSenha  = document.getElementById('inpSenha');
    const inpNick   = document.getElementById('inpNick');
    const inpCargo  = document.getElementById('inpCargo');
    const loginErro = document.getElementById('loginErro');

    // Config da temporada
    const cfg = ls('config', {});
    if (cfg.temporada) document.getElementById('loginSeason').textContent = `TEMPORADA ${cfg.temporada}`;

    btnEye.addEventListener('click', () => {
        const mostrar = inpSenha.type === 'password';
        inpSenha.type = mostrar ? 'text' : 'password';
        btnEye.querySelector('i').className = mostrar ? 'ri-eye-off-line' : 'ri-eye-line';
    });

    inpNick.addEventListener('keydown', e => { if (e.key === 'Enter') inpSenha.focus(); });
    inpSenha.addEventListener('keydown', e => { if (e.key === 'Enter') btnEntrar.click(); });

    btnEntrar.addEventListener('click', () => {
        const nick  = inpNick.value.trim();
        const senha = inpSenha.value;
        const cargo = inpCargo.value;

        if (!nick) { showErro('Digite seu apelido no RP.'); return; }
        if (nick.length < 3) { showErro('Apelido muito curto (mínimo 3 caracteres).'); return; }

        const cfgAtual = ls('config', {});
        const senhaCorreta = cfgAtual.senha || SENHA_GANG;

        // Verificar senha
        if (senha !== senhaCorreta && senha !== SENHA_GERENTE) {
            showErro('Senha incorreta. Consulte o líder da gangue.');
            return;
        }

        // Cargo gerente/líder requer senha de admin
        const cargoPoderoso = ['Gerente','Lider'].includes(cargo);
        if (cargoPoderoso && senha !== SENHA_GERENTE) {
            showErro('Cargo de Gerente/Líder requer senha administrativa.');
            return;
        }

        // Login OK
        SESSAO = {
            nick, cargo,
            isAdmin: ['Gerente','Lider'].includes(cargo),
            isLider: cargo === 'Lider',
            entradaTs: now()
        };

        // Registrar como membro se não existir
        registrarMembro(nick, cargo);

        // Registrar sessão ativa
        const sessoes = ls('sessoes', {});
        sessoes[nick] = { cargo, ts: now() };
        lsSet('sessoes', sessoes);

        iniciarPlataforma();
    });

    function showErro(msg) {
        loginErro.innerHTML = `<i class="ri-error-warning-line"></i> ${sanitize(msg)}`;
        loginErro.style.display = 'flex';
    }
}

function registrarMembro(nick, cargo) {
    const membros = ls('membros', []);
    const exists  = membros.find(m => m.nick.toLowerCase() === nick.toLowerCase());
    if (!exists) {
        membros.push({ nick, cargo, pts: 0, cadastroTs: now() });
        lsSet('membros', membros);
        lsPush('atividades', { icon:'🆕', texto: `<strong>${sanitize(nick)}</strong> entrou na GoddoY RK como ${cargo}`, ts: now() });
    } else {
        // Atualizar último cargo se mudou
        exists.ultimoAcesso = now();
        lsSet('membros', membros);
    }
}

// ════════════════════════════════════════════════════════════
//  PLATAFORMA PRINCIPAL
// ════════════════════════════════════════════════════════════
function iniciarPlataforma() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display   = 'grid';

    // Atualizar info do usuário
    document.getElementById('meNick').textContent  = SESSAO.nick;
    document.getElementById('meCargo').textContent = `${CARGO_EMOJI[SESSAO.cargo] || ''} ${SESSAO.cargo}`;

    // Mostrar admin nav se gerente/líder
    if (SESSAO.isAdmin) {
        document.getElementById('navAdmin').style.display = 'block';
    }

    // Eventos sidebar
    document.getElementById('btnMenu').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
    document.getElementById('btnLogout').addEventListener('click', logout);

    // Navegação
    document.querySelectorAll('.snav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navegarPara(btn.dataset.section);
            closeSidebar();
        });
    });

    // Admin tabs
    document.querySelectorAll('.atab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.atab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const el = document.getElementById('atab-' + tab.dataset.atab);
            if (el) el.classList.add('active');
        });
    });

    // Filtro membros
    document.querySelectorAll('.mem-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mem-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMembros(btn.dataset.cargo);
        });
    });

    // Regras modal
    initRegrasModal();

    // Admin form
    initAdminForms();

    // Chat
    initChat();

    // Carregar dados iniciais
    renderInicio();
    renderRanking();
    renderMembros();
    renderTarefas();
    renderRecompensas();
    if (SESSAO.isAdmin) { renderAdminForms(); renderHistorico(); }

    // Verificar sessões expiradas (limpeza)
    limparSessoesAntigas();
}

function navegarPara(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));

    const sEl = document.getElementById('sec-' + section);
    if (sEl) sEl.classList.add('active');

    const btn = document.querySelector(`.snav-btn[data-section="${section}"]`);
    if (btn) btn.classList.add('active');

    const titles = {
        inicio:'Início', chat:'Chat da Equipe', ranking:'Hall da Fama',
        membros:'Membros', tarefas:'Tarefas & Missões',
        recompensas:'Recompensas', admin:'Painel Admin'
    };
    document.getElementById('topbarTitle').textContent = titles[section] || section;

    // Limpar badge do chat ao entrar no chat
    if (section === 'chat') {
        const badge = document.getElementById('chatBadge');
        badge.style.display = 'none'; badge.textContent = '0';
        renderOnlineMembers();
    }
}

function toggleSidebar() {
    const sb  = document.getElementById('sidebar');
    const ov  = document.getElementById('sidebarOverlay');
    const btn = document.getElementById('btnMenu');
    const open = sb.classList.toggle('visible');
    ov.classList.toggle('visible', open);
    btn.setAttribute('aria-expanded', open);
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('visible');
    document.getElementById('sidebarOverlay').classList.remove('visible');
    document.getElementById('btnMenu').setAttribute('aria-expanded', 'false');
}

function logout() {
    if (!confirm(`Sair da plataforma, ${SESSAO.nick}?`)) return;
    // Remover sessão
    const sessoes = ls('sessoes', {});
    delete sessoes[SESSAO.nick];
    lsSet('sessoes', sessoes);
    SESSAO = null;
    if (chatPollInterval) clearInterval(chatPollInterval);
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('inpNick').value = '';
    document.getElementById('inpSenha').value = '';
    document.getElementById('loginErro').style.display = 'none';
}

function limparSessoesAntigas() {
    const sessoes = ls('sessoes', {});
    const limite  = now() - 4 * 60 * 60 * 1000; // 4 horas
    let mudou = false;
    for (const nick in sessoes) {
        if (sessoes[nick].ts < limite) { delete sessoes[nick]; mudou = true; }
    }
    if (mudou) lsSet('sessoes', sessoes);
}

// ════════════════════════════════════════════════════════════
//  INÍCIO / DASHBOARD
// ════════════════════════════════════════════════════════════
function renderInicio() {
    const cfg     = ls('config', {});
    const membros = ls('membros', []);
    const mensagens = ls('mensagens', []);

    // Config da gangue
    if (cfg.temporada) {
        document.getElementById('seasonNum').textContent = cfg.temporada;
        document.getElementById('topbarSeason').querySelector('span').textContent = `T${cfg.temporada}`;
    }
    if (cfg.dataInicio && cfg.dataFim) {
        const di = new Date(cfg.dataInicio).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
        const df = new Date(cfg.dataFim).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
        document.getElementById('seasonDates').textContent = `${di} – ${df}`;
    }

    // Minha pontuação
    const eu = membros.find(m => m.nick.toLowerCase() === SESSAO.nick.toLowerCase());
    const mePts = eu ? eu.pts : 0;
    document.getElementById('mesPts').textContent = mePts.toLocaleString('pt-BR');

    // Stats da gangue
    const totalPts = membros.reduce((a, m) => a + (m.pts || 0), 0);
    document.getElementById('gangPts').textContent = totalPts.toLocaleString('pt-BR');
    document.getElementById('gangMembros').textContent = membros.length;

    // Cards dashboard
    document.getElementById('dashMsgs').textContent = `${mensagens.length} mensagens`;
    document.getElementById('dashMemCount').textContent = `${Object.keys(ls('sessoes', {})).length} online`;

    // Rank do jogador
    const sorted = [...membros].sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const pos = sorted.findIndex(m => m.nick.toLowerCase() === SESSAO.nick.toLowerCase());
    document.getElementById('dashRankPos').textContent = pos >= 0 ? `#${pos + 1} no ranking` : '#-';

    // Atividades
    renderAtividades();
}

function renderAtividades() {
    const ativs = ls('atividades', []).slice(-20).reverse();
    const el    = document.getElementById('atividades');
    if (!ativs.length) { el.innerHTML = '<div class="ativ-empty">Nenhuma atividade ainda.</div>'; return; }
    el.innerHTML = ativs.map(a => `
        <div class="ativ-item">
            <span class="ativ-icon">${a.icon}</span>
            <span class="ativ-texto">${a.texto}</span>
            <span class="ativ-hora">${horaStr(a.ts)}</span>
        </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  RANKING / HALL DA FAMA
// ════════════════════════════════════════════════════════════
function renderRanking() {
    const membros = ls('membros', []);
    const cfg     = ls('config', {});
    const conq    = ls('conquistas', {});

    const sorted = [...membros].sort((a, b) => (b.pts || 0) - (a.pts || 0));

    // Temporada
    if (cfg.temporada) document.getElementById('rankSeason').textContent = `Temporada ${cfg.temporada}`;

    // Podium
    const podData = [sorted[0], sorted[1], sorted[2]];
    ['pod1','pod2','pod3'].forEach((id, i) => {
        const el = document.getElementById(id);
        const m  = podData[i];
        if (!m) return;
        el.querySelector('.pod-avatar').textContent = iniciais(m.nick);
        el.querySelector('.pod-nick').textContent   = m.nick;
        el.querySelector('.pod-pts').textContent    = (m.pts || 0).toLocaleString('pt-BR') + ' pts';
    });

    // Tabela
    const tbl = document.getElementById('rankingTable');
    if (!sorted.length) { tbl.innerHTML = '<div class="ranking-empty">Nenhuma pontuação registrada ainda.</div>'; return; }
    tbl.innerHTML = sorted.map((m, i) => {
        const cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
        return `<div class="rank-row">
            <div class="rank-pos ${cls}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
            <div class="rank-avatar">${iniciais(m.nick)}</div>
            <div class="rank-info">
                <div class="rank-nick">${sanitize(m.nick)}</div>
                <div class="rank-cargo">${CARGO_EMOJI[m.cargo] || ''} ${m.cargo}</div>
            </div>
            <div class="rank-pts">${(m.pts || 0).toLocaleString('pt-BR')}</div>
        </div>`;
    }).join('');

    // Conquistas
    ['cq1','cq2','cq3','cq4','cq5','cq6'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = conq[`cq${i+1}`] || '-';
    });
}

// ════════════════════════════════════════════════════════════
//  MEMBROS
// ════════════════════════════════════════════════════════════
function renderMembros(filtro = 'todos') {
    const membros = ls('membros', []);
    const sessoes = ls('sessoes', {});
    const grid    = document.getElementById('membrosGrid');

    document.getElementById('memTotal').textContent = membros.length;

    let lista = filtro === 'todos' ? membros : membros.filter(m => m.cargo === filtro);
    lista = [...lista].sort((a, b) => (CARGO_HIERARQUIA[b.cargo] || 0) - (CARGO_HIERARQUIA[a.cargo] || 0));

    if (!lista.length) { grid.innerHTML = '<div class="mem-empty">Nenhum membro encontrado.</div>'; return; }

    grid.innerHTML = lista.map(m => {
        const online = !!sessoes[m.nick];
        return `<div class="mem-card">
            <div class="mem-card-avatar">${iniciais(m.nick)}</div>
            <div class="mem-card-nick">${sanitize(m.nick)}</div>
            <div class="mem-card-cargo">${CARGO_EMOJI[m.cargo] || ''} ${m.cargo}</div>
            <div class="mem-card-pts">${(m.pts || 0).toLocaleString('pt-BR')} pts</div>
            <div class="mem-card-status ${online ? 'online' : 'offline'}">${online ? '● Online' : '○ Offline'}</div>
        </div>`;
    }).join('');
}

// ════════════════════════════════════════════════════════════
//  TAREFAS
// ════════════════════════════════════════════════════════════
function renderTarefas() {
    const tarefas = ls('tarefas', TAREFAS_DEFAULT);
    const grid    = document.getElementById('tarefasGrid');

    if (!tarefas.length) { grid.innerHTML = '<div class="tarefas-empty">Nenhuma tarefa cadastrada.</div>'; return; }

    const difLabel = { facil:'🟢 Fácil', media:'🟡 Média', dificil:'🔴 Difícil', elite:'👑 Elite' };
    grid.innerHTML = tarefas.map(t => `
        <div class="tarefa-card">
            <div class="tarefa-top">
                <div class="tarefa-nome">${sanitize(t.nome)}</div>
                <div class="tarefa-dif dif-${t.dif}">${difLabel[t.dif] || t.dif}</div>
            </div>
            <div class="tarefa-desc">${sanitize(t.desc)}</div>
            <div class="tarefa-pts"><i class="ri-star-fill"></i> ${(t.pts || 0).toLocaleString('pt-BR')} pts</div>
        </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  RECOMPENSAS
// ════════════════════════════════════════════════════════════
function renderRecompensas() {
    const recomp = ls('recompensas', RECOMPENSAS_DEFAULT);
    const grid   = document.getElementById('recompGrid');
    grid.innerHTML = recomp.map(r => `
        <div class="recomp-card">
            <div class="recomp-icon">${r.icon}</div>
            <div class="recomp-nome">${sanitize(r.nome)}</div>
            <div class="recomp-req">${sanitize(r.req)}</div>
            <div class="recomp-pts"><i class="ri-trophy-fill"></i> ${sanitize(r.pts)}</div>
        </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  CHAT
// ════════════════════════════════════════════════════════════
function initChat() {
    const input    = document.getElementById('chatInput');
    const btnSend  = document.getElementById('btnSend');
    const btnAudio = document.getElementById('btnAudio');
    const count    = document.getElementById('chatCount');

    input.addEventListener('input', () => {
        // auto-resize
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 110) + 'px';
        count.textContent = `${input.value.length}/500`;
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensagem();
        }
    });

    btnSend.addEventListener('click', enviarMensagem);
    btnAudio.addEventListener('click', toggleGravacao);

    document.getElementById('btnStopRec').addEventListener('click', pararGravacao);
    document.getElementById('btnCancelRec').addEventListener('click', cancelarGravacao);

    // Carregar mensagens existentes
    carregarMensagens();

    // Polling (demo mode)
    chatPollInterval = setInterval(carregarMensagens, 3000);
}

function carregarMensagens() {
    const msgs    = ls('mensagens', []);
    const chatEl  = document.getElementById('chatMsgs');
    const isBottom = chatEl.scrollHeight - chatEl.scrollTop <= chatEl.clientHeight + 50;

    // Verificar novas mensagens
    let temNovas = false;
    msgs.forEach(m => {
        if (!chatMsgIds.has(m.id)) {
            chatMsgIds.add(m.id);
            temNovas = true;
            appendMensagem(m, false); // false = não animar primeiro carregamento
        }
    });

    // Notificar badge se chat não estiver ativo
    const chatAtivo = document.getElementById('sec-chat').classList.contains('active');
    if (temNovas && !chatAtivo && msgs.length > 0) {
        const badge = document.getElementById('chatBadge');
        badge.style.display = 'inline';
        badge.textContent   = String(parseInt(badge.textContent || '0') + msgs.filter(m => !chatMsgIds.has(m.id + '_seen')).length);
    }

    if (isBottom) chatEl.scrollTop = chatEl.scrollHeight;
}

function appendMensagem(msg, animate = true) {
    const chatEl = document.getElementById('chatMsgs');
    const eu     = msg.nick === SESSAO.nick;

    if (msg.tipo === 'sistema') {
        const div = document.createElement('div');
        div.className = 'chat-msg chat-msg-sistema';
        div.innerHTML = `<span class="chat-sys-txt">${sanitize(msg.conteudo)}</span>`;
        chatEl.appendChild(div);
        return;
    }

    let conteudo = '';
    if (msg.tipo === 'audio') {
        conteudo = `<div class="cmsg-audio">
            <i class="ri-mic-fill"></i>
            <audio class="cmsg-audio-player" src="${msg.audioData}" controls preload="none"></audio>
        </div>`;
    } else {
        conteudo = `<div class="cmsg-txt">${sanitize(msg.conteudo).replace(/\n/g,'<br>')}</div>`;
    }

    const div = document.createElement('div');
    div.className = `chat-msg ${eu ? 'chat-msg-eu' : ''} ${animate ? 'chat-msg-new' : ''}`;
    div.innerHTML = `
        <div class="cmsg-avatar">${iniciais(msg.nick)}</div>
        <div class="cmsg-body">
            <div class="cmsg-meta">
                <span class="cmsg-nick">${sanitize(msg.nick)}</span>
                <span class="cmsg-cargo">${CARGO_EMOJI[msg.cargo] || ''} ${sanitize(msg.cargo)}</span>
                <span class="cmsg-hora">${horaStr(msg.ts)}</span>
            </div>
            ${conteudo}
        </div>`;

    chatEl.appendChild(div);
    if (animate) {
        const isBottom = chatEl.scrollHeight - chatEl.scrollTop <= chatEl.clientHeight + 100;
        if (isBottom || eu) setTimeout(() => { chatEl.scrollTop = chatEl.scrollHeight; }, 50);
    }
}

function enviarMensagem() {
    const input = document.getElementById('chatInput');
    const txt   = input.value.trim();
    if (!txt) return;

    const msg = {
        id: 'msg_' + now() + '_' + Math.random().toString(36).slice(2,6),
        nick: SESSAO.nick, cargo: SESSAO.cargo,
        tipo: 'texto', conteudo: txt, ts: now()
    };

    lsPush('mensagens', msg);
    chatMsgIds.add(msg.id);
    appendMensagem(msg, true);

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('chatCount').textContent = '0/500';
    document.getElementById('chatMsgs').scrollTop = 999999;

    // Atividade
    lsPush('atividades', { icon:'💬', texto:`<strong>${sanitize(SESSAO.nick)}</strong> enviou uma mensagem no chat`, ts: now() });
}

// ─── GRAVAÇÃO DE ÁUDIO ───────────────────────────────────────
function toggleGravacao() {
    if (isGravando) { pararGravacao(); } else { iniciarGravacao(); }
}

async function iniciarGravacao() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRec = new MediaRecorder(stream);
        audioChunks = [];
        mediaRec.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRec.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            if (audioChunks.length === 0) return;
            const blob   = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                const msg = {
                    id: 'msg_' + now() + '_' + Math.random().toString(36).slice(2,6),
                    nick: SESSAO.nick, cargo: SESSAO.cargo,
                    tipo: 'audio', conteudo: '[Áudio]', audioData: reader.result, ts: now()
                };
                lsPush('mensagens', msg);
                chatMsgIds.add(msg.id);
                appendMensagem(msg, true);
            };
            reader.readAsDataURL(blob);
            audioChunks = [];
        };

        mediaRec.start();
        isGravando = true;
        recSec = 0;
        document.getElementById('recStatus').style.display = 'flex';
        document.getElementById('btnAudio').classList.add('gravando');
        recTimerInterval = setInterval(() => {
            recSec++;
            document.getElementById('recTimer').textContent = recSec + 's';
            if (recSec >= 60) pararGravacao();
        }, 1000);
    } catch {
        toast('Sem permissão de microfone.', 'error');
    }
}

function pararGravacao() {
    if (!isGravando) return;
    clearInterval(recTimerInterval);
    isGravando = false;
    if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
    document.getElementById('recStatus').style.display = 'none';
    document.getElementById('btnAudio').classList.remove('gravando');
}

function cancelarGravacao() {
    audioChunks = [];
    pararGravacao();
}

function renderOnlineMembers() {
    const sessoes = ls('sessoes', {});
    limparSessoesAntigas();
    const list = document.getElementById('onlineList');
    const nicks = Object.entries(sessoes).filter(([n, s]) => s.ts > now() - 4*60*60*1000);
    if (!nicks.length) { list.innerHTML = '<div class="cm-item" style="color:var(--text-3);font-size:.78rem">Ninguém online</div>'; return; }
    list.innerHTML = nicks.map(([nick, s]) => `
        <div class="cm-item">
            <div class="cm-dot"></div>
            <span>${sanitize(nick)}</span>
        </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  ADMIN
// ════════════════════════════════════════════════════════════
function renderAdminForms() {
    const membros = ls('membros', []);
    const sels    = ['adm-mem-sel', 'adm-prom-sel'];
    const opts    = membros.map(m => `<option value="${sanitize(m.nick)}">${sanitize(m.nick)} (${m.cargo})</option>`).join('');

    sels.forEach(id => {
        const sel = document.getElementById(id);
        const first = sel.options[0].outerHTML;
        sel.innerHTML = first + opts;
    });

    renderAdmMemList();

    // Config atual
    const cfg = ls('config', {});
    if (cfg.temporada) document.getElementById('adm-season').value = cfg.temporada;
    if (cfg.dataInicio) document.getElementById('adm-season-start').value = cfg.dataInicio;
    if (cfg.dataFim)    document.getElementById('adm-season-end').value   = cfg.dataFim;

    // Conquistas
    const conq = ls('conquistas', {});
    ['cq1','cq2','cq3','cq4','cq5','cq6'].forEach(k => {
        const el = document.getElementById(k + '-inp');
        if (el) el.value = conq[k] || '';
    });
}

function renderAdmMemList() {
    const membros = ls('membros', []);
    const list    = document.getElementById('admMemList');
    if (!membros.length) { list.innerHTML = '<div class="hist-empty">Nenhum membro cadastrado.</div>'; return; }
    list.innerHTML = membros.map((m, i) => `
        <div class="adm-mem-row">
            <div class="adm-mem-nick">${sanitize(m.nick)}</div>
            <div class="adm-mem-cargo">${CARGO_EMOJI[m.cargo] || ''} ${m.cargo}</div>
            <div style="font-family:var(--ff-title);font-size:.75rem;color:var(--red)">${(m.pts||0).toLocaleString('pt-BR')}</div>
            ${SESSAO.isLider ? `<button class="btn-del-mem" onclick="deletarMembro(${i})" title="Remover"><i class="ri-delete-bin-line"></i></button>` : ''}
        </div>`).join('');
}

function renderHistorico() {
    // Pontuações
    const hist = ls('hist_pts', []).slice().reverse();
    const hEl  = document.getElementById('ptsHistorico');
    if (!hist.length) { hEl.innerHTML = '<div class="hist-empty">Nenhum registro ainda.</div>'; }
    else hEl.innerHTML = hist.map(h => `
        <div class="hist-item">
            <span class="hist-icon">${h.pts > 0 ? '⬆️' : '⬇️'}</span>
            <div class="hist-info">
                <strong>${sanitize(h.nick)}</strong> — ${sanitize(h.motivo)}
                <span class="hist-hora">${dataHora(h.ts)} · por ${sanitize(h.por)}</span>
            </div>
            <div class="hist-val ${h.pts > 0 ? 'pos' : 'neg'}">${h.pts > 0 ? '+' : ''}${h.pts.toLocaleString('pt-BR')}</div>
        </div>`).join('');

    // Promoções
    const prom  = ls('hist_prom', []).slice().reverse();
    const pEl   = document.getElementById('promHistorico');
    if (!prom.length) { pEl.innerHTML = '<div class="hist-empty">Nenhum registro ainda.</div>'; }
    else pEl.innerHTML = prom.map(p => `
        <div class="hist-item">
            <span class="hist-icon">⭐</span>
            <div class="hist-info">
                <strong>${sanitize(p.nick)}</strong> → ${CARGO_EMOJI[p.novoCargo] || ''} ${sanitize(p.novoCargo)}
                <span class="hist-hora">${dataHora(p.ts)} · ${sanitize(p.motivo)} · por ${sanitize(p.por)}</span>
            </div>
            <div class="hist-val pos">PROMOÇÃO</div>
        </div>`).join('');
}

function initAdminForms() {
    if (!SESSAO.isAdmin) return;

    // Adicionar pontos
    document.getElementById('btnAddPts').addEventListener('click', () => {
        const nick   = document.getElementById('adm-mem-sel').value;
        const pts    = parseInt(document.getElementById('adm-pts-inp').value);
        const motivo = document.getElementById('adm-pts-motivo').value.trim();
        if (!nick) return toast('Selecione um membro.', 'error');
        if (isNaN(pts) || pts <= 0) return toast('Informe os pontos.', 'error');
        if (!motivo) return toast('Informe o motivo.', 'error');
        alterarPontos(nick, pts, motivo);
    });

    document.getElementById('btnRemPts').addEventListener('click', () => {
        const nick   = document.getElementById('adm-mem-sel').value;
        const pts    = parseInt(document.getElementById('adm-pts-inp').value);
        const motivo = document.getElementById('adm-pts-motivo').value.trim();
        if (!nick) return toast('Selecione um membro.', 'error');
        if (isNaN(pts) || pts <= 0) return toast('Informe os pontos.', 'error');
        if (!motivo) return toast('Informe o motivo.', 'error');
        alterarPontos(nick, -pts, motivo);
    });

    // Promover
    document.getElementById('btnPromover').addEventListener('click', () => {
        const nick      = document.getElementById('adm-prom-sel').value;
        const novoCargo = document.getElementById('adm-cargo-sel').value;
        const motivo    = document.getElementById('adm-prom-motivo').value.trim();
        if (!nick) return toast('Selecione um membro.', 'error');
        if (!motivo) return toast('Informe o motivo.', 'error');
        promoverMembro(nick, novoCargo, motivo);
    });

    // Cadastrar membro
    document.getElementById('btnCadMem').addEventListener('click', () => {
        const nick  = document.getElementById('adm-new-nick').value.trim();
        const cargo = document.getElementById('adm-new-cargo').value;
        if (!nick || nick.length < 3) return toast('Apelido inválido.', 'error');
        const membros = ls('membros', []);
        if (membros.find(m => m.nick.toLowerCase() === nick.toLowerCase())) {
            return toast('Membro já cadastrado.', 'error');
        }
        membros.push({ nick, cargo, pts: 0, cadastroTs: now() });
        lsSet('membros', membros);
        lsPush('atividades', { icon:'🆕', texto:`<strong>${sanitize(nick)}</strong> foi cadastrado como ${cargo}`, ts: now() });
        document.getElementById('adm-new-nick').value = '';
        renderAdmMemList();
        renderAdminForms();
        renderMembros();
        toast('Membro cadastrado!', 'success');
    });

    // Criar tarefa
    document.getElementById('btnCriarTask').addEventListener('click', () => {
        const nome = document.getElementById('adm-task-nome').value.trim();
        const desc = document.getElementById('adm-task-desc').value.trim();
        const pts  = parseInt(document.getElementById('adm-task-pts').value);
        const dif  = document.getElementById('adm-task-dif').value;
        if (!nome) return toast('Informe o nome da tarefa.', 'error');
        if (!desc) return toast('Informe a descrição.', 'error');
        if (isNaN(pts) || pts < 0) return toast('Pontuação inválida.', 'error');
        const tarefas = ls('tarefas', TAREFAS_DEFAULT);
        tarefas.push({ id:'t_'+now(), nome, desc, pts, dif });
        lsSet('tarefas', tarefas);
        renderTarefas();
        document.getElementById('adm-task-nome').value = '';
        document.getElementById('adm-task-desc').value = '';
        document.getElementById('adm-task-pts').value  = '';
        toast('Tarefa criada!', 'success');
    });

    // Salvar config
    document.getElementById('btnSaveConfig').addEventListener('click', () => {
        const temporada   = document.getElementById('adm-season').value;
        const dataInicio  = document.getElementById('adm-season-start').value;
        const dataFim     = document.getElementById('adm-season-end').value;
        const senhaNova   = document.getElementById('adm-senha-atual').value.trim();
        const cfg = ls('config', {});
        if (temporada) cfg.temporada = parseInt(temporada);
        if (dataInicio) cfg.dataInicio = dataInicio;
        if (dataFim)    cfg.dataFim    = dataFim;
        if (senhaNova && senhaNova.length >= 4) cfg.senha = senhaNova;
        lsSet('config', cfg);
        renderInicio();
        renderRanking();
        toast('Configurações salvas!', 'success');
    });

    // Salvar conquistas
    document.getElementById('btnSaveConq').addEventListener('click', () => {
        const conq = {};
        ['cq1','cq2','cq3','cq4','cq5','cq6'].forEach(k => {
            conq[k] = document.getElementById(k + '-inp').value.trim();
        });
        lsSet('conquistas', conq);
        renderRanking();
        toast('Conquistas salvas!', 'success');
    });
}

function alterarPontos(nick, pts, motivo) {
    const membros = ls('membros', []);
    const m = membros.find(mb => mb.nick === nick);
    if (!m) { toast('Membro não encontrado.', 'error'); return; }
    m.pts = Math.max(0, (m.pts || 0) + pts);
    lsSet('membros', membros);

    lsPush('hist_pts', { nick, pts, motivo, por: SESSAO.nick, ts: now() });
    lsPush('atividades', {
        icon: pts > 0 ? '⬆️' : '⬇️',
        texto: `<strong>${sanitize(nick)}</strong> ${pts > 0 ? 'ganhou' : 'perdeu'} <strong>${Math.abs(pts).toLocaleString('pt-BR')} pts</strong> — ${sanitize(motivo)}`,
        ts: now()
    });

    // Limpar campos
    document.getElementById('adm-pts-inp').value    = '';
    document.getElementById('adm-pts-motivo').value = '';

    renderRanking();
    renderMembros();
    renderHistorico();
    renderAdminForms();
    renderInicio();
    toast(`${pts > 0 ? '+' : ''}${pts.toLocaleString('pt-BR')} pts para ${nick}!`, 'success');
}

function promoverMembro(nick, novoCargo, motivo) {
    const membros = ls('membros', []);
    const m = membros.find(mb => mb.nick === nick);
    if (!m) { toast('Membro não encontrado.', 'error'); return; }
    const cargAnt = m.cargo;
    m.cargo = novoCargo;
    lsSet('membros', membros);

    lsPush('hist_prom', { nick, cargoAnt: cargAnt, novoCargo, motivo, por: SESSAO.nick, ts: now() });
    lsPush('atividades', {
        icon:'⭐',
        texto:`<strong>${sanitize(nick)}</strong> foi promovido para <strong>${sanitize(novoCargo)}</strong> — ${sanitize(motivo)}`,
        ts: now()
    });

    // Anunciar no chat
    const msgProm = {
        id: 'msg_'+now()+'_prom', nick:'GoddoY RK', cargo:'Sistema',
        tipo:'sistema', conteudo:`⭐ PROMOÇÃO: ${nick} agora é ${CARGO_EMOJI[novoCargo] || ''} ${novoCargo}! Parabéns!`, ts: now()
    };
    lsPush('mensagens', msgProm);

    document.getElementById('adm-prom-motivo').value = '';
    renderRanking();
    renderMembros();
    renderHistorico();
    renderAdminForms();
    toast(`${nick} promovido para ${novoCargo}!`, 'success');
}

window.deletarMembro = function(idx) {
    if (!SESSAO.isLider) { toast('Apenas o líder pode remover membros.', 'error'); return; }
    const membros = ls('membros', []);
    const nick = membros[idx].nick;
    if (!confirm(`Remover ${nick} da gangue?`)) return;
    membros.splice(idx, 1);
    lsSet('membros', membros);
    renderAdmMemList();
    renderMembros();
    toast(`${nick} removido.`);
};

// ════════════════════════════════════════════════════════════
//  MODAL — VERIFICADOR DE REGRAS
// ════════════════════════════════════════════════════════════
function initRegrasModal() {
    const fabBtn   = document.getElementById('btnRegras');
    const modal    = document.getElementById('modalRegras');
    const fecharBtn = document.getElementById('btnFecharRegras');
    const input    = document.getElementById('regrasInput');
    const count    = document.getElementById('regrasCount');

    fabBtn.addEventListener('click', () => {
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        setTimeout(() => input.focus(), 200);
        renderRegrasChips();
    });
    fecharBtn.addEventListener('click', fecharModal);
    modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

    function fecharModal() {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    // ESC fecha
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) fecharModal();
    });

    input.addEventListener('input', () => {
        count.textContent = input.value.length;
    });

    document.getElementById('btnLimparRegras').addEventListener('click', () => {
        input.value = '';
        count.textContent = '0';
        document.getElementById('regrasResultado').innerHTML = `
            <div class="rm-placeholder">
                <i class="ri-shield-line"></i>
                <p>Descreva o ocorrido e clique em <strong>Verificar com IA</strong></p>
            </div>`;
    });

    document.getElementById('btnVerificarRegras').addEventListener('click', verificarRegras);

    // Voz
    const btnVoz = document.getElementById('btnVozRegras');
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recog = new SR();
        recog.lang = 'pt-BR'; recog.continuous = false; recog.interimResults = false;
        recog.onresult = e => { input.value += e.results[0][0].transcript + ' '; count.textContent = input.value.length; };
        recog.onerror  = () => toast('Erro no reconhecimento de voz.', 'error');
        btnVoz.addEventListener('click', () => { recog.start(); btnVoz.classList.add('active'); });
        recog.onend = () => btnVoz.classList.remove('active');
    } else {
        btnVoz.disabled = true; btnVoz.title = 'Voz não suportada neste navegador';
    }
}

function renderRegrasChips() {
    const chips = document.getElementById('regrasChips');
    if (!window.REGRAS_RP) return;
    chips.innerHTML = window.REGRAS_RP.slice(0, 12).map(r =>
        `<button class="rm-chip-q" onclick="preencherExemplo('${r.codigo}')">${r.codigo}</button>`
    ).join('');
}

window.preencherExemplo = function(codigo) {
    if (!window.REGRAS_RP) return;
    const regra = window.REGRAS_RP.find(r => r.codigo === codigo);
    if (!regra || !regra.exemplos?.length) return;
    const ex = regra.exemplos[Math.floor(Math.random() * regra.exemplos.length)];
    document.getElementById('regrasInput').value = ex;
    document.getElementById('regrasCount').textContent = ex.length;
};

async function verificarRegras() {
    const input   = document.getElementById('regrasInput');
    const relato  = input.value.trim();
    const resEl   = document.getElementById('regrasResultado');

    if (relato.length < 10) {
        toast('Descreva melhor o que aconteceu (mínimo 10 caracteres).', 'error');
        return;
    }

    resEl.innerHTML = `<div class="rm-placeholder"><div style="width:28px;height:28px;border:3px solid #252a38;border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto .5rem"></div><p>Analisando com IA...</p></div>`;

    let resultado = null;

    // Tentar Netlify Function
    try {
        const r = await fetch('/.netlify/functions/verificar-ia', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ relato })
        });
        if (r.ok) resultado = await r.json();
    } catch {}

    // Fallback: análise local
    if (!resultado && window.verificarInfracao) {
        resultado = window.verificarInfracao(relato);
        if (resultado) resultado._local = true;
    }

    if (!resultado) {
        resEl.innerHTML = '<div class="rm-placeholder"><i class="ri-error-warning-line" style="color:var(--red)"></i><p>Erro ao analisar. Tente novamente.</p></div>';
        return;
    }

    renderResultadoRegras(resultado, resEl);
}

function renderResultadoRegras(r, el) {
    const regrasDetalhes = (r.regras || []).map(codigo => {
        if (!window.REGRAS_RP) return { codigo, nome: codigo };
        return window.REGRAS_RP.find(rg => rg.codigo === codigo) || { codigo, nome: codigo };
    });

    const chipsHtml = regrasDetalhes.length > 0
        ? regrasDetalhes.map(rg => `<div class="${chipClass(rg.codigo)}">${rg.icon || ''} ${rg.codigo} — ${rg.nome}</div>`).join('')
        : '<span class="rm-chip-none">Nenhuma regra identificada</span>';

    const badge = r._local
        ? '<div class="rm-local-badge"><i class="ri-cpu-line"></i> Análise Local</div>'
        : '<div class="rm-gemini-badge"><i class="ri-sparkle-line"></i> Análise IA</div>';

    const conf = r.confianca ? `<span class="rm-conf-badge">${r.confianca}% de confiança</span>` : '';

    const alert7 = r.alert7 ? `
        <div class="rm-alert7-box">
            <div class="rm-alert7-icon">⭐</div>
            <div class="rm-box-title">ALERT 7 — DECISÃO GERENCIAL</div>
            <p class="rm-box-txt">Este caso requer avaliação de um gerente ou administrador do servidor.</p>
        </div>` : '';

    el.innerHTML = `<div class="rm-result-card">
        <div class="rm-result-header">${badge}${conf}</div>
        <div>
            <div class="rm-box-title" style="margin-bottom:.4rem">Regras Violadas</div>
            <div class="rm-regras-chips">${chipsHtml}</div>
        </div>
        ${r.analise ? `<div class="rm-analise-box"><div class="rm-box-title">Análise</div><p class="rm-box-txt">${sanitize(r.analise)}</p></div>` : ''}
        ${r.penalidade ? `<div class="rm-penalidade-box"><div class="rm-box-title">⚖️ Penalidade Sugerida</div><p class="rm-box-txt">${sanitize(r.penalidade)}</p></div>` : ''}
        ${alert7}
    </div>`;
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initLogin();

    // Verificar sessão anterior
    const sessaoAnterior = sessionStorage.getItem('grk_nick');
    if (sessaoAnterior) {
        const nick  = sessaoAnterior;
        const cargo = sessionStorage.getItem('grk_cargo') || 'Membro';
        SESSAO = {
            nick, cargo,
            isAdmin: ['Gerente','Lider'].includes(cargo),
            isLider: cargo === 'Lider'
        };
        iniciarPlataforma();
    }

    // Salvar sessão no sessionStorage após login
    const origIniciar = iniciarPlataforma;
    // (a sessão será salva inline nas funções)
});

// Guardar sessão em sessionStorage ao iniciar
const _origIniciar = window.iniciarPlataforma;
function salvarSessaoStorage() {
    if (SESSAO) {
        sessionStorage.setItem('grk_nick',  SESSAO.nick);
        sessionStorage.setItem('grk_cargo', SESSAO.cargo);
    }
}

// Interceptar iniciarPlataforma para salvar sessão
const _orig = iniciarPlataforma;
window.iniciarPlataforma = function() {
    _orig();
    salvarSessaoStorage();
};

// Expor navegarPara globalmente
window.navegarPara = navegarPara;
