const fs = require('fs');
let lines = fs.readFileSync('js/platform.js', 'utf-8').split('\n');
if (lines[283].trim() === 'async') {
    lines.splice(283, 1);
}
fs.writeFileSync('js/platform.js', lines.join('\n'), 'utf-8');
console.log('Removed stray async keyword');
