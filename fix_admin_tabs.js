const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf8');

const aprovacoesCode = `
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

        list.innerHTML = pendentes.map(m => \`
            <div class="admin-member-row">
                <div class="avatar avatar-sm">\${GRK.getInitials(m.nick)}</div>
                <div class="admin-member-info">
                    <div class="admin-member-nick">\${escapeHtml(m.nick)}</div>
                    <div class="admin-member-cargo" style="color: var(--gold);">Aguardando Aprova\\u00e7\\u00e3o</div>
                </div>
                <div class="admin-member-actions">
                    <button class="btn btn-primary btn-xs btn-aprovar" data-id="\${m.id}" data-nick="\${escapeHtml(m.nick)}">
                        Aprovar
                    </button>
                </div>
            </div>
        \`).join('');

        list.querySelectorAll('.btn-aprovar').forEach(btn => {
            btn.addEventListener('click', () => {
                const nick = btn.dataset.nick;
                const id = btn.dataset.id;
                document.getElementById('promoverId').value = id;
                document.getElementById('promoverCargo').value = 'Recruta'; // Default
                document.getElementById('promoverMotivo').value = 'Aprova\\u00e7\\u00e3o inicial';
                setTextById('promoverNickDisplay', nick);
                showEl('modalPromover');
            });
        });

    } catch (e) {
        list.innerHTML = GRK.emptyState('ri-error-warning-line', 'Erro ao carregar', '');
    }
}
`;

js = js.replace(/async function carregarAdminMembros\(\) \{/, 
aprovacoesCode + '\nasync function carregarAdminMembros() {');

// We should also filter out 'Pendente' from the normal Members list
js = js.replace(/list\.innerHTML = membros\.map\(m => `/g, `list.innerHTML = membros.filter(m => m.cargo !== 'Pendente').map(m => \``);

// Update tab click handling
js = js.replace(/if \(tab === 'membros'\) carregarAdminMembros\(\);/g, `if (tab === 'membros') carregarAdminMembros();
        if (tab === 'aprovacoes') carregarAprovacoes();`);

fs.writeFileSync('js/platform.js', js, 'utf8');
console.log('Done');
