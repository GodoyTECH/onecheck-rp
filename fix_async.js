const fs = require('fs');
let js = fs.readFileSync('js/platform.js').toString();

// List of functions that use await but might be missing "async"
const funcsToFix = [
    'function carregarRanking()',
    'function carregarHome()',
    'function carregarChat()',
    'function carregarMissoes()',
    'function carregarConquistas()',
    'function carregarPerfil()',
    'function carregarAdmin()',
    'function carregarRosterPublico()',
    'function pollChat()',
    'function pollDM()',
    'function carregarParticipantes()',
    'function carregarDMList()',
    'function carregarDMConversa(',
    'function carregarNotificacoes()',
    'function verPerfil(',
    'function carregarMembroPerfil(',
    'function iniciarApp()',
    'function abrirModalPromover(',
    'function desativarMembro(',
    'function excluirEvTar(',
];

let fixed = 0;
funcsToFix.forEach(fn => {
    if (js.includes(fn) && !js.includes('async ' + fn)) {
        js = js.replace(new RegExp(fn.replace('(', '\\(').replace(')', '\\)'), 'g'), 'async ' + fn);
        fixed++;
        console.log('Fixed: ' + fn);
    }
});

// Also fix arrow functions assigned to variables
const arrowFix = [
    'carregarRosterPublico = async',
];

// Extra: fix window.excluirEvTar  
js = js.replace('window.excluirEvTar = (id)', 'window.excluirEvTar = async (id)');

console.log('Total fixed:', fixed);
fs.writeFileSync('js/platform.js', js, 'utf8');
