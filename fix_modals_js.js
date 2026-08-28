const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf-8');

js = js.replace(/classList\.remove\('visible'\)/g, "classList.add('hidden')");
js = js.replace(/classList\.add\('visible'\)/g, "classList.remove('hidden')");

fs.writeFileSync('js/platform.js', js, 'utf-8');
console.log('Fixed visible -> hidden in platform.js');
