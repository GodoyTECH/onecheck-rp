const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf-8');

js = js.replace(/async function carregarAdmin\(\) \{\s*await carregarAdminMembros\(\);\s*preencherConquistasAdmin\(\{\}\);\s*\}/, "async function carregarAdmin() {\n    await carregarAprovacoes();\n    await carregarAdminMembros();\n    preencherConquistasAdmin({});\n}");

fs.writeFileSync('js/platform.js', js, 'utf-8');
console.log('Added carregarAprovacoes to carregarAdmin');
