import sys

with open('js/platform.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix fazerLogout
js = js.replace('GRK.confirm(', 'if(confirm(')
# We need to make sure the if block is closed properly if it was a callback
# wait, the original was:
# GRK.confirm('Deseja sair da sua conta?', async () => {
#    ...
# });
# We should just replace GRK.confirm with confirm and run the code inline

js = js.replace("GRK.confirm('Deseja sair da sua conta?', async () => {", "if (confirm('Deseja sair da sua conta?')) {")

# Fix pushToggle
old_push = """    document.getElementById('pushToggle')?.addEventListener('click', async () => {
        if (window.PWA) {
            try {
                await PWA.solicitarPermissaoPush();
                GRK.toast('Notifica\u00e7\u00f5es ativadas! \ud83d\udd14', 'success');
                carregarConfig();
            } catch (e) {
                GRK.toast('Permiss\u00e3o negada', 'error');
            }
        }
    });"""

new_push = """    document.getElementById('pushToggle')?.addEventListener('click', async () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            return GRK.toast('Ja esta ativo! Para desativar, mude nas permissoes do site.', 'info');
        }
        if (window.PWA) {
            try {
                await PWA.solicitarPermissaoPush();
                GRK.toast('Notificacoes ativadas! 🔔', 'success');
                carregarConfig();
            } catch (e) {
                GRK.toast('Permissao negada', 'error');
            }
        }
    });"""

js = js.replace(old_push, new_push)

with open('js/platform.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed fazerLogout and pushToggle")
