const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf-8');

const funcsToAdd = `
// ── Funções de Roster / Admin Roster ───────────────
window.verPerfil = function(id) {
    if (id === STATE.user.id) {
        navigateTo('perfil');
    } else {
        navigateTo('membroPerfil', { membroId: id });
    }
};

window.abrirModalPromover = function(id, nick, cargoAtual) {
    // Add simple prompt or modal implementation for promoting
    const novoCargo = prompt(\`Promover \${nick}\\nCargo atual: \${cargoAtual}\\n\\nDigite o novo cargo (ex: Lider, Gerente, Tenente, Oficial, Veterano, Membro):\`);
    if (!novoCargo) return;
    
    if (confirm(\`Confirmar promoção de \${nick} para \${novoCargo}?\`)) {
        API.promover(id, novoCargo, 'Promoção manual').then(() => {
            GRK.toast('Membro promovido com sucesso!', 'success');
            carregarRosterPublico();
        }).catch(e => GRK.toast(e.message, 'error'));
    }
};

window.desativarMembro = function(id) {
    if (confirm('Tem certeza que deseja desativar (expulsar) este membro?')) {
        // Implement PATCH /fac-membros/:id/desativar
        API._fetch(\`/.netlify/functions/fac-membros/\${id}/desativar\`, { method: 'PATCH' }, true)
            .then(() => {
                GRK.toast('Membro expulso.', 'success');
                carregarRosterPublico();
            })
            .catch(e => GRK.toast(e.message, 'error'));
    }
};
`;

js += '\n' + funcsToAdd;
fs.writeFileSync('js/platform.js', js, 'utf-8');
console.log('Added missing roster functions');
