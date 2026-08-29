const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf-8');

js = js.replace(/case 'perfil':\s*carregarPerfil\(\);\s*break;/, "case 'perfil':      carregarPerfil();       break;\n        case 'membros':     carregarRosterPublico(); break;");

fs.writeFileSync('js/platform.js', js, 'utf-8');
console.log('Added case membros');
