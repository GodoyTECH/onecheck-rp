const fs = require('fs');
const lines = fs.readFileSync('js/platform.js', 'utf-8').split('\n');
lines.forEach((l, i) => {
    if(l.includes('addEventListener(\'click\'') || l.includes('addEventListener("click"')) {
        console.log(i+1, l.trim());
    }
});
