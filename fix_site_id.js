const fs = require('fs');
const glob = require('glob');

const files = [
    'netlify/functions/fac-chat.js',
    'netlify/functions/fac-denuncia.js',
    'netlify/functions/fac-posts.js',
    'faccoes/sql/schema.sql'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (file.endsWith('.js')) {
        content = content.replace(/process\.env\.SITE_ID/g, 'process.env.NETLIFY_SITE_ID');
    } else if (file.endsWith('.sql')) {
        content = content.replace(/SITE_ID/g, 'NETLIFY_SITE_ID');
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});
