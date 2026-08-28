const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const js = fs.readFileSync('js/platform.js', 'utf-8');

// List buttons
const buttonMatches = html.matchAll(/id="([^"]+)"/g);
const ids = new Set();
for (const match of buttonMatches) {
    if (match[1].startsWith('btn') || match[1].startsWith('nav')) {
        ids.add(match[1]);
    }
}

console.log('Button/Nav IDs in HTML:');
for (const id of ids) {
    const hasListener = js.includes(`'${id}'`) || js.includes(`"${id}"`);
    console.log(`- ${id}: ${hasListener ? 'OK (referenced in JS)' : 'NOT FOUND IN JS'}`);
}
