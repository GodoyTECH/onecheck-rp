const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf-8');
js = js.replace("['membros', 'criar', 'pontuar', 'conquistas']", "['membros', 'aprovacoes', 'pontuar', 'conquistas']");
fs.writeFileSync('js/platform.js', js, 'utf-8');
console.log('Fixed admin tabs array');
