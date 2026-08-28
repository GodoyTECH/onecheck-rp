const fs = require('fs');

let css = fs.readFileSync('css/platform.css').toString();

// 1. Remove the old login-screen block (it never got replaced)
// and remove the duplicate login-content/login-logo-img blocks added by append
css = css.replace(
    /\.login-screen \{[\s\S]*?padding: 24px;\n\}/,
    `/* login-screen was here - replaced below */`
);

// 2. Remove all appended login duplicates at the bottom (anything from the first appended block)
const appendStart = css.indexOf('\n\n.login-content {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    width: 100%;\n    max-width: 400px;\n    margin: auto;\n    z-index: 10;\n}');
if (appendStart !== -1) {
    // Remove from this point to the first new CSS section we added
    const keepFrom = css.indexOf('\n/* Roster Grid */');
    css = css.substring(0, appendStart) + (keepFrom !== -1 ? css.substring(keepFrom) : '');
}

// 3. Remove the login-logo-img duplicate (appended)
const dupLogoStart = css.indexOf('\n.login-logo-img {\n    width: 120px;');
if (dupLogoStart !== -1) {
    const dupLogoEnd = css.indexOf('\n\n\n\n', dupLogoStart);
    css = css.substring(0, dupLogoStart) + (dupLogoEnd !== -1 ? css.substring(dupLogoEnd) : '');
}

// 4. Remove login-bg section at the bottom (if duplicate)
const bgStart = css.indexOf('\n/* Login BG Layer */');
if (bgStart !== -1) {
    css = css.substring(0, bgStart) + css.substring(bgStart + css.substring(bgStart).indexOf('\n/* ==========================================================================\n   GANG BANNER'));
}

console.log('After cleanup, length:', css.length);

// 5. Now inject the definitive login CSS right after the placeholder
const correctLoginCss = `
/* ==========================================================================
   10. Login Screen  — TELA DE LOGIN COMPLETA
   ========================================================================== */

.login-screen {
  position: fixed;
  inset: 0;
  background: #0d0d0d;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  z-index: 100;
  padding: 40px 20px 80px;
}

.login-bg {
  position: fixed;
  inset: 0;
  background: url('/images/logo.jpg') center/cover no-repeat;
  z-index: 0;
  opacity: 0.05;
  pointer-events: none;
}

.login-bg-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, rgba(13,13,13,0.97) 0%, rgba(13,13,13,0.90) 60%, rgba(13,13,13,0.99) 100%);
  z-index: 1;
  pointer-events: none;
}

.login-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-identity {
  text-align: center;
  margin-bottom: 20px;
}

.login-logo-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #FF0000;
  box-shadow: 0 0 20px rgba(255,0,0,0.3);
  margin: 0 auto 10px;
  object-fit: cover;
  display: block;
}

.login-gang-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  color: #fff;
  letter-spacing: 2px;
  display: none; /* hide - logo already has text */
}

.login-tagline {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.5);
  display: none; /* hide - logo already has text */
}

.login-card {
  width: 100%;
  background: #161616;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 24px 20px;
  margin-bottom: 12px;
}

.login-card-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.6rem;
  letter-spacing: 2px;
  color: #fff;
  margin-bottom: 4px;
}

.login-card-sub {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.5);
  margin-bottom: 20px;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,0.3);
  font-size: 0.75rem;
  margin: 14px 0;
  text-align: center;
}
.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.08);
}

.login-loading {
  position: absolute;
  inset: 0;
  background: rgba(13,13,13,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  border-radius: 16px;
}
.login-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #FF0000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.login-loading-text {
  color: rgba(255,255,255,0.6);
  font-size: 0.85rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

.btn-instalar-pwa {
  margin-top: 12px;
  background: none;
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.5);
  padding: 10px 20px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.btn-instalar-pwa:hover { border-color: rgba(255,0,0,0.4); color: #fff; }
`;

css = css.replace('/* login-screen was here - replaced below */', correctLoginCss);

fs.writeFileSync('css/platform.css', css, 'utf8');
console.log('CSS login fixed. New length:', fs.readFileSync('css/platform.css').length);
