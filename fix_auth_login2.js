const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf8');

const newLoginBlock = `
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
`;

// Replace from `/* ═══════════════════════════════════════════════════════════\n   LOGIN FLOW` to `function mostrarErroLogin(step, msg) {`
js = js.replace(/\/\*\s*═══════════════════════════════════════════════════════════\s*LOGIN FLOW\s*═══════════════════════════════════════════════════════════\s*\*\/[\s\S]*?function mostrarErroLogin\(step, msg\) \{/, newLoginBlock.trim() + " {");

// Change event listener for regEntrarBtn
js = js.replace(/document\.getElementById\('regEntrarBtn'\)\?\.addEventListener\('click', loginStep2Submit\);/, `document.getElementById('regEntrarBtn')?.addEventListener('click', registerSubmit);`);

// In case the event listener was not replaced at all
if (!js.includes('registerSubmit);')) {
    js = js.replace(/document\.getElementById\('loginEntrarBtn'\)\?\.addEventListener\('click', async \(\) => \{[\s\S]*?\}\);/m, 
    `document.getElementById('loginEntrarBtn')?.addEventListener('click', loginStep1Submit);`);
}

fs.writeFileSync('js/platform.js', js, 'utf8');
console.log('Login logic updated.');
