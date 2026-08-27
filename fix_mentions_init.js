const fs = require('fs');
let js = fs.readFileSync('js/platform.js', 'utf8');

// Initialize MENTIONS
js = js.replace(/async function iniciarApp\(\) \{/, 
`async function iniciarApp() {
    MENTIONS.init();`);

// Apply formatMentions in renderChat
js = js.replace(/const contentHtml = escapeHtml\(m\.conteudo\)\.replace\(\/\\n\/g, '<br>'\);/g, 
`const escaped = escapeHtml(m.conteudo).replace(/\\n/g, '<br>');
         const contentHtml = window.MENTIONS ? window.MENTIONS.formatMentions(escaped) : escaped;`);

fs.writeFileSync('js/platform.js', js, 'utf8');
console.log('Done rendering mentions');
