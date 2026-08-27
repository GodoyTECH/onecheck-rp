/**
 * GoddoY RK — Netlify Function: fac-auth
 * Autenticação com nick + PIN de 4 dígitos
 * Todas as credenciais via variáveis de ambiente
 */

const crypto = require('crypto');

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

    const path = event.path.replace('/.netlify/functions/fac-auth', '');
    const method = event.httpMethod;

    try {
        // ── POST /login ──────────────────────────────────────
        if (method === 'POST' && (path === '/login' || path === '' || path === '/')) {
            return await handleLogin(event);
        }

        // ── POST /logout ─────────────────────────────────────
        if (method === 'POST' && path === '/logout') {
            return await handleLogout(event);
        }

        // ── POST /criar-membro (admin) ───────────────────────
        if (method === 'POST' && path === '/criar-membro') {
            return await handleCriarMembro(event);
        }

        // ── POST /gerar-vapid (admin, uma vez só) ────────────
        if (method === 'POST' && path === '/gerar-vapid') {
            return await handleGerarVapid();
        }

        return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Endpoint não encontrado' }) };

    } catch (err) {
        console.error('[fac-auth] Erro:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erro interno' }) };
    }
};

// ── Hash de PIN (SHA-256 simples + salt) ─────────────────────
function hashPin(pin, salt) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const h = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
                    .update(pin + s).digest('hex');
    return { hash: s + ':' + h, salt: s };
}
function verificarPin(pin, storedHash) {
    const [salt, expected] = storedHash.split(':');
    const { hash } = hashPin(pin, salt);
    return hash === storedHash;
}

// ── Gerar JWT simples ─────────────────────────────────────────
function gerarToken(payload, expiresIn = '30d') {
    const header  = Buffer.from(JSON.stringify({ alg:'HS256', typ:'JWT' })).toString('base64url');
    const now     = Math.floor(Date.now() / 1000);
    const exp     = now + (expiresIn === '30d' ? 30*24*3600 : 24*3600);
    const body    = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');
    const sig     = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
                          .update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verificarToken(token) {
    try {
        const [header, body, sig] = token.split('.');
        const expectedSig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
                                  .update(`${header}.${body}`).digest('base64url');
        if (sig !== expectedSig) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch { return null; }
}

// ── Supabase fetch helper ─────────────────────────────────────
async function sb(path, opts = {}) {
    const url  = `${process.env.SUPABASE_URL}/rest/v1${path}`;
    const res  = await fetch(url, {
        ...opts,
        headers: {
            'Content-Type':  'application/json',
            'apikey':        process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Prefer':        'return=representation',
            ...(opts.headers || {})
        }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
}

// ── LOGIN ─────────────────────────────────────────────────────
async function handleLogin(event) {
    const body = JSON.parse(event.body || '{}');
    const { nick, pin, lembrar = false, device_info = '' } = body;

    if (!nick?.trim() || !pin) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nick e PIN obrigatórios' }) };
    }

    // Verificar admin mestre via env vars (sem tocar no banco)
    const masterNick = process.env.ADMIN_MASTER_NICK || '';
    const masterPin  = process.env.ADMIN_MASTER_PIN  || '';
    let membro = null;

    if (nick.toLowerCase() === masterNick.toLowerCase() && pin === masterPin) {
        // Login do admin mestre — criar/buscar no banco
        const existing = await sb(`/membros?nick=eq.${encodeURIComponent(nick)}&limit=1`);
        if (existing && existing.length > 0) {
            membro = existing[0];
        } else {
            // Criar admin mestre automaticamente
            const { hash } = hashPin(pin);
            const created = await sb('/membros', {
                method: 'POST',
                body: JSON.stringify({ nick, pin_hash: hash, cargo: 'Lider', is_admin: true })
            });
            membro = created[0];
        }
    } else {
        // Login normal
        const membros = await sb(`/membros?nick=ilike.${encodeURIComponent(nick)}&is_ativo=eq.true&limit=1`);
        if (!membros || membros.length === 0) {
            return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Nick não encontrado ou inativo' }) };
        }
        membro = membros[0];
        if (!verificarPin(pin, membro.pin_hash)) {
            return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'PIN incorreto' }) };
        }
    }

    // Gerar token
    const token = gerarToken({
        id:       membro.id,
        nick:     membro.nick,
        cargo:    membro.cargo,
        isAdmin:  membro.is_admin,
        isLider:  membro.cargo === 'Lider'
    }, lembrar ? '30d' : '1d');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Salvar sessão no banco
    await sb('/sessoes', {
        method: 'POST',
        body: JSON.stringify({
            membro_id:  membro.id,
            token_hash: tokenHash,
            device_info,
            lembrar,
            expires_at: new Date(Date.now() + (lembrar ? 30 : 1) * 24*3600*1000).toISOString()
        })
    }).catch(() => {}); // não bloquear login se falhar

    // Atualizar último acesso
    await sb(`/membros?id=eq.${membro.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ultimo_acesso: new Date().toISOString() })
    }).catch(() => {});

    return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
            token,
            membro: {
                id:       membro.id,
                nick:     membro.nick,
                cargo:    membro.cargo,
                nivel:    membro.nivel,
                nivel_ak: membro.nivel_ak,
                pontos:   membro.pontos,
                avatar_url: membro.avatar_url,
                is_admin: membro.is_admin
            }
        })
    };
}

// ── LOGOUT ────────────────────────────────────────────────────
async function handleLogout(event) {
    const token = (event.headers.authorization || '').replace('Bearer ', '');
    if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await sb(`/sessoes?token_hash=eq.${tokenHash}`, { method: 'DELETE' }).catch(() => {});
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
}

// ── CRIAR MEMBRO (admin) ──────────────────────────────────────
async function handleCriarMembro(event) {
    // Verificar autenticação admin
    const token = (event.headers.authorization || '').replace('Bearer ', '');
    const payload = verificarToken(token);
    if (!payload?.isAdmin) {
        return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Apenas admins podem criar membros' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { nick, cargo = 'Recruta' } = body;

    if (!nick?.trim() || nick.length < 3) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nick inválido (mínimo 3 caracteres)' }) };
    }

    // Gerar PIN de 4 dígitos
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const { hash } = hashPin(pin);

    try {
        const created = await sb('/membros', {
            method: 'POST',
            body: JSON.stringify({
                nick:     nick.trim(),
                pin_hash: hash,
                cargo:    cargo,
                is_admin: ['Gerente','Lider'].includes(cargo)
            })
        });

        return {
            statusCode: 201,
            headers: CORS,
            body: JSON.stringify({
                membro: { id: created[0].id, nick: created[0].nick, cargo: created[0].cargo },
                pin,  // PIN em texto claro — enviar para o novo membro e depois descartar
                aviso: 'Envie este PIN ao novo integrante. Ele não pode ser recuperado depois.'
            })
        };
    } catch (err) {
        if (err.message?.includes('unique')) {
            return { statusCode: 409, headers: CORS, body: JSON.stringify({ error: 'Nick já cadastrado' }) };
        }
        throw err;
    }
}

// ── GERAR CHAVES VAPID ────────────────────────────────────────
async function handleGerarVapid() {
    // Gerar chaves VAPID usando Node.js crypto (ECDHp256)
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding:  { type:'spki',  format:'der' },
        privateKeyEncoding: { type:'pkcs8', format:'der' }
    });

    return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
            publicKey:  publicKey.toString('base64url'),
            privateKey: privateKey.toString('base64url'),
            instrucoes: 'Adicione VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas variáveis de ambiente do Netlify. Não chame esta função novamente depois de configurado.'
        })
    };
}

// Exportar verificarToken para uso em outras functions
module.exports.verificarToken = verificarToken;
module.exports.sb = sb;
