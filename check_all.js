const fs = require('fs');
const path = require('path');
const dir = 'netlify/functions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('utils'));
let allOk = true;
files.forEach(f => {
    try {
        new Function(fs.readFileSync(path.join(dir, f)).toString());
        console.log('OK:', f);
    } catch(e) {
        console.error('FAIL:', f, '-', e.message);
        allOk = false;
    }
});
if (allOk) console.log('\n✅ All functions syntax OK');
else console.error('\n❌ Some functions have errors');
