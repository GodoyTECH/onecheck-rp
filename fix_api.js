const fs = require('fs');
let js = fs.readFileSync('js/api.js', 'utf8');

// Remove the garbage appended at the end
js = js.replace(/\/\/ ⚔️ EVENTOS E TAREFAS[\s\S]*/, '');
// Handle strange encoding append if any
js = js.replace(/window\.API\.checkConfigured\(\);[\s\S]*/, 'window.API.checkConfigured();');

// Inject into window.API
const inject = `
    // ⚔️ EVENTOS E TAREFAS
    async getEventos() {
        return await this._fetch('/.netlify/functions/fac-eventos');
    },
    async criarEvento(dados) {
        return await this._fetch('/.netlify/functions/fac-eventos', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    },
    async excluirEvento(id) {
        return await this._fetch('/.netlify/functions/fac-eventos/' + id, {
            method: 'DELETE'
        });
    },
    // 🤖 IA PARSER
    async parseEventosIA(texto, imagemBase64, mimeType) {
        return await this._fetch('/.netlify/functions/fac-ai-parser', {
            method: 'POST',
            body: JSON.stringify({ texto, imagemBase64, mimeType })
        });
    }
`;

js = js.replace(/async verSenhas\(\) \{[\s\S]*?\}\s*};/, (match) => {
    return match.replace(/};$/, inject + '\n};');
});

fs.writeFileSync('js/api.js', js, 'utf8');
