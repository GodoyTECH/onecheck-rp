const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf8');

// Replace loginStep1Submit and loginStep2Submit
js = js.replace(/function loginStep1Submit\(\) \{[\s\S]*?async function loginStep2Submit\(\) \{[\s\S]*?senhaInput\.focus\(\);\s*\}\s*\}/m, 
`document.getElementById('loginShowRegisterBtn')?.addEventListener('click', () => {
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
        const result = await API.login(nick, senha, lembrarCheck);
        // AUTH.login is no longer returning result in old code, let's just use it
        // wait, earlier I updated AUTH.login in auth.js to return membro and accept (nick, pin, lembrar)
        // so I should just do:
        const membro = await AUTH.login(nick, senha, lembrarCheck);
        STATE.setUser(membro);
        await iniciarApp();
    } catch (e) {
        hideEl('loginLoading');
        showEl('loginStep1');
        mostrarErroLogin('step1', e.message || 'Erro ao logar');
    }
}

async function loginStep2Submit() {
    // We repurpose loginStep2Submit as registerSubmit
    const nick = document.getElementById('regNickInput')?.value?.trim();
    const senha = document.getElementById('regSenhaInput')?.value?.trim();

    if (!nick || !senha || nick.length < 2 || senha.length < 4) {
        mostrarErroLogin('step2', 'Nick v\\u00e1lido e senha m\\u00ednima de 4 caracteres');
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
}`);

// Change events
js = js.replace(/document\.getElementById\('loginEntrarBtn'\)\?\.addEventListener\('click', async \(\) => \{[\s\S]*?\}\);/m, 
`document.getElementById('loginEntrarBtn')?.addEventListener('click', loginStep1Submit);`);

js = js.replace(/document\.getElementById\('loginContinueBtn'\)\?\.addEventListener\('click', loginStep1Submit\);/m, 
`document.getElementById('regEntrarBtn')?.addEventListener('click', loginStep2Submit);`);

js = js.replace(/document\.getElementById\('pinBackBtn'\)\?\.addEventListener\('click', \(\) => \{[\s\S]*?\}\);/m, ``);

// IniciarApp restriction check
js = js.replace(/function renderAppShell\(\) \{/, 
`function renderAppShell() {
    const user = STATE.getUser();
    if (user && user.cargo === 'Pendente') {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.disabled = true;
            chatInput.placeholder = 'Conta em an\\u00e1lise pelo Admin...';
        }
        document.getElementById('chatSendBtn')?.classList.add('hidden');
        document.getElementById('chatAudioBtn')?.classList.add('hidden');
    } else {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.placeholder = 'Mensagem para GoddoY RK...';
        }
        document.getElementById('chatSendBtn')?.classList.remove('hidden');
        document.getElementById('chatAudioBtn')?.classList.remove('hidden');
    }
`);

fs.writeFileSync('js/platform.js', js, 'utf8');
console.log('Modified platform.js');
