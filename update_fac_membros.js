const fs = require('fs');
let js = fs.readFileSync('netlify/functions/fac-membros.js', 'utf8');

const logic = `
        // -----------------------------------------------------
        // PATCH /:id/editar-perfil (Self edit)
        // -----------------------------------------------------
        const matchEdit = sub.match(/^([0-9a-f-]+)\/editar-perfil$/);
        if (event.httpMethod === 'PATCH' && matchEdit) {
            const userId = matchEdit[1];
            if (userId !== payload.id) return erro('Não autorizado', 403);
            
            const updates = JSON.parse(event.body || '{}');
            if (updates.nick) {
                await sql\`UPDATE membros SET nick = \${updates.nick}, updated_at = NOW() WHERE id = \${userId}\`;
            }
            if (updates.senha) {
                // simple btoa for now as established in fac-auth
                const hash = Buffer.from(updates.senha).toString('base64');
                await sql\`UPDATE membros SET senha_hash = \${hash}, updated_at = NOW() WHERE id = \${userId}\`;
            }
            return ok({ ok: true });
        }
`;

const insertIndex = js.indexOf('// 🚧 PATCH /:id/desativar  (admin) 🚧');
if (insertIndex !== -1) {
    js = js.substring(0, insertIndex) + logic + '\n        ' + js.substring(insertIndex);
    fs.writeFileSync('netlify/functions/fac-membros.js', js, 'utf8');
    console.log('Membros API updated');
} else {
    // try different search
    const insert2 = js.indexOf('const matchId = sub.match(/^([0-9a-f-]+)\\/desativar$/);');
    if (insert2 !== -1) {
        js = js.substring(0, insert2) + logic + '\n        ' + js.substring(insert2);
        fs.writeFileSync('netlify/functions/fac-membros.js', js, 'utf8');
        console.log('Membros API updated');
    }
}
