const fs = require('fs');

const css = `
.login-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 400px;
    margin: auto;
    z-index: 10;
}

.login-identity {
    text-align: center;
    margin-bottom: 30px;
}

.login-logo-img {
    width: 120px;
    height: 120px;
    border-radius: var(--r-xl);
    border: 2px solid var(--red);
    box-shadow: 0 0 30px var(--red-glow);
    margin: 0 auto 15px;
    object-fit: cover;
}
`;

fs.appendFileSync('css/platform.css', css, 'utf8');
console.log('CSS Appended');
