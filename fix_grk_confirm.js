const fs = require('fs');

let js = fs.readFileSync('js/platform.js', 'utf-8');

js = js.replace(/GRK\.confirm\(`Resetar Senha de \$\{btn\.dataset\.nick\}\?`, async \(\) => \{/, "if(confirm(`Resetar Senha de ${btn.dataset.nick}?`)) {");

fs.writeFileSync('js/platform.js', js, 'utf-8');
console.log("Fixed GRK.confirm in platform.js");
