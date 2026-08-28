const fs = require('fs');
let css = fs.readFileSync('css/platform.css').toString();

// 1. Fix .login-screen to have overflow scroll so it scrolls on mobile
css = css.replace(
    '.login-screen {\n  position: fixed;\n  inset: 0;\n  background: radial-gradient(circle at center, var(--bg-card) 0%, var(--bg-base) 100%);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  padding: 24px;\n}',
    '.login-screen {\n  position: fixed;\n  inset: 0;\n  background: var(--bg-base);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: flex-start;\n  overflow-y: auto;\n  z-index: 100;\n  padding: 40px 24px 60px;\n}'
);

// 2. Add missing CSS classes
const missingCss = `

/* Login BG Layer */
.login-bg {
  position: fixed;
  inset: 0;
  background: url('/images/logo.jpg') center/cover no-repeat;
  z-index: 0;
  opacity: 0.06;
  pointer-events: none;
}
.login-bg-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0.85) 50%, rgba(13,13,13,0.98) 100%);
  z-index: 1;
  pointer-events: none;
}
.login-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 380px;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
}
.login-identity {
  text-align: center;
  margin-bottom: 24px;
}
.login-logo-img {
  width: 90px;
  height: 90px;
  border-radius: var(--r-xl);
  border: 2px solid var(--red);
  box-shadow: 0 0 30px var(--red-glow);
  margin: 0 auto 12px;
  object-fit: cover;
  display: block;
}
.login-gang-name {
  font-family: var(--ff-title);
  font-size: 2rem;
  color: var(--text-1);
  letter-spacing: 2px;
}
.login-tagline {
  font-size: 0.8rem;
  color: var(--text-2);
  margin-top: 4px;
}
.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-3);
  font-size: 0.75rem;
  margin: 12px 0;
  text-align: center;
}
.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
.login-card-title {
  font-family: var(--ff-title);
  font-size: 1.6rem;
  letter-spacing: 2px;
  margin-bottom: 4px;
  color: var(--text-1);
}
.login-card-sub {
  font-size: 0.8rem;
  color: var(--text-2);
  margin-bottom: 20px;
}
.login-loading {
  position: absolute;
  inset: 0;
  background: rgba(13,13,13,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  border-radius: var(--r-lg);
}
.login-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.login-loading-text {
  color: var(--text-2);
  font-size: 0.9rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

.btn-instalar-pwa {
  margin-top: 16px;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-2);
  padding: 10px 24px;
  border-radius: var(--r-full);
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}
`;

fs.appendFileSync('css/platform.css', missingCss, 'utf8');
console.log('CSS fixed');
