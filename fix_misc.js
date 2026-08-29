const fs = require('fs');

let js = fs.readFileSync('js/platform.js', 'utf-8');

js = js.replace("GRK.confirm('Deseja sair da sua conta?', async () => {", "if (confirm('Deseja sair da sua conta?')) {");

const oldPush = `    document.getElementById('pushToggle')?.addEventListener('click', async () => {
        if (window.PWA) {
            try {
                await PWA.solicitarPermissaoPush();
                GRK.toast('Notificações ativadas! 🔔', 'success');
                carregarConfig();
            } catch (e) {
                GRK.toast('Permissão negada', 'error');
            }
        }
    });`;

const oldPush2 = `    document.getElementById('pushToggle')?.addEventListener('click', async () => {
        if (window.PWA) {
            try {
                await PWA.solicitarPermissaoPush();
                GRK.toast('Notificações ativadas! 🔔', 'success');
                carregarConfig();
            } catch (e) {
                GRK.toast('Permissão negada', 'error');
            }
        }
    });`.replace('🔔', '??'); // sometimes encoding issues

// We'll just do a more robust replace for pushToggle
js = js.replace(/document\.getElementById\('pushToggle'\)\?\.addEventListener\('click', async \(\) => \{[\s\S]*?\}\);/, `document.getElementById('pushToggle')?.addEventListener('click', async () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            return GRK.toast('Já está ativo! Para desativar, mude nas permissões do navegador.', 'info');
        }
        if (window.PWA) {
            try {
                await PWA.solicitarPermissaoPush();
                GRK.toast('Notificações ativadas! 🔔', 'success');
                carregarConfig();
            } catch (e) {
                GRK.toast('Permissão negada', 'error');
            }
        }
    });`);

fs.writeFileSync('js/platform.js', js, 'utf-8');
console.log("Fixed fazerLogout and pushToggle");
