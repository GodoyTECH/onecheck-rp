const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

// Replace .classList.remove('visible') with .classList.add('hidden')
html = html.replace(/classList\.remove\('visible'\)/g, "classList.add('hidden')");
// Replace .classList.add('visible') with .classList.remove('hidden')
html = html.replace(/classList\.add\('visible'\)/g, "classList.remove('hidden')");

fs.writeFileSync('index.html', html, 'utf-8');
console.log('Fixed inline modal visibility clicks in index.html');
