const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const matches = html.match(/onclick="([^"]+)"/g) || [];
console.log('Inline onclicks in index.html:', matches.length);
matches.forEach(m => console.log(m));
