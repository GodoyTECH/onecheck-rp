const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf8');

const logic = `
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
    
    grid.innerHTML = lista.map(m => \`
        <div class="roster-card" onclick="verPerfil('\${m.id}')" style="cursor:pointer;">
            \${ m.avatar_url ? \`<img src="\${m.avatar_url}" class="roster-card-avatar">\` : \`<div class="roster-card-avatar" style="display:flex;align-items:center;justify-content:center;"><i class="ri-user-line"></i></div>\` }
            <div class="roster-card-info">
                <div class="roster-card-nick">\${escapeHtml(m.nick)} \${m.is_admin ? '<i class="ri-shield-star-line text-gold" title="Admin"></i>' : ''}</div>
                <div class="roster-card-cargo">\${escapeHtml(m.cargo)}</div>
            </div>
            \${ STATE.user.is_admin && m.id !== STATE.user.id ? \`
                <div class="roster-card-actions" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="abrirModalPromover('\${m.id}', '\${escapeHtml(m.nick)}', '\${m.cargo}')"><i class="ri-arrow-up-circle-line"></i></button>
                    <button class="btn-icon" style="color:var(--red);" onclick="desativarMembro('\${m.id}')"><i class="ri-user-unfollow-line"></i></button>
                </div>
            \` : ''}
        </div>
    \`).join('');
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
`;

const insertIndex = js.indexOf('function carregarRanking()');
if (insertIndex !== -1) {
    js = js.substring(0, insertIndex) + logic + '\n' + js.substring(insertIndex);
}

// Add carregarRosterPublico to the view switch logic
js = js.replace(/if \(viewName === 'ranking'\) carregarRanking\(\);/, "if (viewName === 'ranking') carregarRanking();\n    if (viewName === 'membros') carregarRosterPublico();");

// Add 'membros' to VIEWS
js = js.replace(/perfil: { id: 'viewPerfil', title: 'MEU PERFIL', back: false },/, "membros: { id: 'viewMembros', title: 'ROSTER', back: false },\n    perfil: { id: 'viewPerfil', title: 'MEU PERFIL', back: false },");

// Fix nav array check
js = js.replace(/const navViews = \['home', 'chat', 'ranking', 'missoes', 'perfil'\];/, "const navViews = ['home', 'chat', 'ranking', 'missoes', 'membros', 'perfil'];");


fs.writeFileSync('js/platform.js', js, 'utf8');
console.log('Platform updated for roster');
