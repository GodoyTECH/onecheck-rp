const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf8');

js = js.replace("document.getElementById('totalMembrosRoster').textContent = allMembrosRoster.length;",
`document.getElementById('totalMembrosRoster').textContent = allMembrosRoster.length;
        const totalPts = allMembrosRoster.reduce((acc, m) => acc + (m.pontos || 0), 0);
        const gbMembros = document.getElementById('gbMembrosGerais');
        if(gbMembros) gbMembros.textContent = allMembrosRoster.length + '/45';
        const gbPontos = document.getElementById('gbPontosGerais');
        if(gbPontos) gbPontos.textContent = totalPts;`);

fs.writeFileSync('js/platform.js', js, 'utf8');
console.log('Banner stats added');
