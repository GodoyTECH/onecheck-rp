const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('<!-- \n<div id="viewConquistas"', '<div id="viewConquistas"');
fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed comment trap');
