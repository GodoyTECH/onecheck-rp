const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('modalEditPerfil') && !l.includes('id="modalEditPerfil"')) {
        console.log(i + 1, l.trim());
    }
});
