const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add Membros to Sidebar
html = html.replace('<button class="sidebar-nav-item" data-view="perfil">',
`<button class="sidebar-nav-item" data-view="membros">
    <i class="ri-group-line sidebar-nav-icon"></i>
    <span class="sidebar-nav-label">Membros</span>
</button>
<button class="sidebar-nav-item" data-view="perfil">`);

// 2. Add Membros to Bottom Nav
html = html.replace('<button class="bottom-nav-item" data-view="perfil" aria-label="Perfil">',
`<button class="bottom-nav-item" data-view="membros" aria-label="Membros">
    <i class="ri-group-line"></i>
    <span>Membros</span>
</button>
<button class="bottom-nav-item" data-view="perfil" aria-label="Perfil">`);

// 3. Add viewMembros
const viewMembros = `
            <!-- ══════════════════════════════════════════════
                 VIEW: MEMBROS (ROSTER PUBLICO)
            ══════════════════════════════════════════════ -->
            <div id="viewMembros" class="view hidden">
                <div class="section-header">
                    <div class="section-title">LISTA DE MEMBROS (<span id="totalMembrosRoster">0</span>)</div>
                </div>
                <div class="input-field-wrap mb-1">
                    <i class="ri-search-line"></i>
                    <input type="text" id="rosterSearchInput" class="input-field" placeholder="Buscar membro por nick ou cargo...">
                </div>
                <div class="roster-grid" id="rosterGrid">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
            </div>
`;
html = html.replace('<div id="viewPerfil" class="view hidden">', viewMembros + '\n            <div id="viewPerfil" class="view hidden">');

// 4. Add Editar Perfil button and modal
const profileActions = `
                <div class="profile-actions" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-outline" onclick="document.getElementById('modalEditPerfil').classList.add('visible')">
                        <i class="ri-edit-line"></i> Editar Dados (Nome/Senha)
                    </button>
                </div>
`;
html = html.replace('<!-- Stats Grid -->', profileActions + '\n                <!-- Stats Grid -->');

const modalEditPerfil = `
    <!-- MODAL EDITAR PERFIL -->
    <div id="modalEditPerfil" class="modal-overlay hidden">
        <div class="modal-card">
            <h2 class="modal-title">Editar Perfil</h2>
            <div class="input-field-wrap mb-1">
                <i class="ri-user-smile-line"></i>
                <input type="text" id="editPerfilNick" class="input-field" placeholder="Novo Nickname">
            </div>
            <div class="input-field-wrap mb-1">
                <i class="ri-lock-password-line"></i>
                <input type="password" id="editPerfilSenha" class="input-field" placeholder="Nova Senha (Deixe em branco p/ manter)">
            </div>
            <div class="modal-actions">
                <button class="btn btn-ghost" onclick="document.getElementById('modalEditPerfil').classList.remove('visible')">Cancelar</button>
                <button class="btn btn-primary" id="btnSalvarEditPerfil">Salvar</button>
            </div>
        </div>
    </div>
`;
html = html.replace('<!-- MODAL ADD TAREFA -->', modalEditPerfil + '\n    <!-- MODAL ADD TAREFA -->');

fs.writeFileSync('index.html', html, 'utf8');
console.log('HTML updated');
