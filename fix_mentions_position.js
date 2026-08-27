const fs = require('fs');
let js = fs.readFileSync('js/mentions.js', 'utf8');

js = js.replace(/menuEl\.style\.bottom = '100%';/g, `
        // Position globally using fixed coordinates
        const inputRect = currentInput.getBoundingClientRect();
        
        // Convert to absolute fixed positions
        menuEl.style.position = 'fixed';
        menuEl.style.left = inputRect.left + 'px';
        menuEl.style.width = inputRect.width + 'px';
        menuEl.style.bottom = (window.innerHeight - inputRect.top + 8) + 'px'; // 8px spacing
        menuEl.style.top = 'auto'; // ensure top is not set
`);

fs.writeFileSync('js/mentions.js', js, 'utf8');

// Also update CSS to remove bottom: 100%
let css = fs.readFileSync('css/platform.css', 'utf8');
css = css.replace(/bottom: 100%;/g, '/* dynamically set */');
css = css.replace(/\.mentions-menu \{[\s\S]*?position: absolute;/g, `.mentions-menu {\n    position: fixed;`);
fs.writeFileSync('css/platform.css', css, 'utf8');

console.log('Mentions positioning fixed.');
