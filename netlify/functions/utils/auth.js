/**
 * GoddoY RK — utils/auth.js
 * JWT helpers compartilhados por todas as Netlify Functions
 */
const crypto = require('crypto');

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

// ── Hash de PIN ───────────────────────────────────────────────
function hashPin(pin, salt) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const h = crypto.createHmac('sha256', process.env.JWT_SECRET || 'grk-fallback')
                    .update(pin + s).digest('hex');
    return { hash: `${s}:${h}`, salt: s };
}

function verificarPin(pin, storedHash) {
    const [salt] = storedHash.split(':');
    const { hash } = hashPin(String(pin), salt);
    return hash === storedHash;
}

// ── JWT ───────────────────────────────────────────────────────
function gerarToken(payload, dias = 30) {
    const secret = process.env.JWT_SECRET || 'grk-fallback';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now    = Math.floor(Date.now() / 1000);
    const body   = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + dias * 86400 })).toString('base64url');
    const sig    = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verificarToken(token) {
    if (!token) return null;
    try {
        const [header, body, sig] = token.split('.');
        const secret   = process.env.JWT_SECRET || 'grk-fallback';
        const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
        if (sig !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch { return null; }
}

function extrairToken(event) {
    const auth = event.headers?.authorization || event.headers?.Authorization || '';
    return auth.replace(/^Bearer\s+/i, '').trim() || null;
}

// ── Respostas padrão ─────────────────────────────────────────
function ok(data, status = 200) {
    return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}
function erro(msg, status = 400) {
    return { statusCode: status, headers: CORS, body: JSON.stringify({ error: msg }) };
}
function preflight() {
    return { statusCode: 200, headers: CORS, body: '' };
}

// ── PIN aleatório de 4 dígitos ───────────────────────────────
function gerarPin() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

module.exports = {
    CORS, hashPin, verificarPin,
    gerarToken, verificarToken, extrairToken,
    ok, erro, preflight, gerarPin
};
