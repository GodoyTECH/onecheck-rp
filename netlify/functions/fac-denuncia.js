/**
 * GoddoY RK — Netlify Function: fac-denuncia
 * Sistema de denúncias com upload de evidências (foto/vídeo até 30s)
 */

const crypto = require('crypto');

const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
};

const TIPOS_VALIDOS = [
    'dm_sem_motivo', 'rdm_na_rua', 'taser_veiculo',
    'invasao_territorio', 'desrespeito_toxicidade',
    'contra_integrante', 'outro'
];

async function sb(path, opts = {}) {
    const url = `${process.env.SUPABASE_URL}/rest/v1${path}`;
    const res = await fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation',
            ...(opts.headers || {})
        }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
}

function verificarToken(token) {
    try {
        const [header, body, sig] = token.split('.');
        const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
                               .update(`${header}.${body}`).digest('base64url');
        if (sig !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch { return null; }
}

async function uploadEvidencia(base64Data, mimeType, fileName) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
    const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64');

    // Verificar tamanho máximo: 50MB para vídeo 30s
    const maxBytes = 50 * 1024 * 1024;
    if (buffer.length > maxBytes) throw new Error('Arquivo muito grande. Máximo 50MB.');

    const res = await fetch(`${supabaseUrl}/storage/v1/object/denuncias-evidencias/${fileName}`, {
        method: 'POST',
        headers: {
            'Authorization':  `Bearer ${serviceKey}`,
            'apikey':         serviceKey,
            'Content-Type':   mimeType,
            'Content-Length': buffer.length
        },
        body: buffer
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error('Upload falhou: ' + JSON.stringify(err));
    }

    // URL privada (admin só pode acessar)
    return `${supabaseUrl}/storage/v1/object/denuncias-evidencias/${fileName}`;
}

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

    const path   = event.path.replace('/.netlify/functions/fac-denuncia', '');
    const method = event.httpMethod;

    const token = (event.headers.authorization || '').replace('Bearer ', '');
    const usuario = verificarToken(token);
    if (!usuario) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Não autorizado' }) };

    try {

        // ── POST / — criar denúncia ───────────────────────────
        if (method === 'POST' && (path === '' || path === '/')) {
            const body = JSON.parse(event.body || '{}');
            const { nick_denunciado, tipo_denuncia, descricao, evidencia_base64, evidencia_tipo } = body;

            if (!nick_denunciado?.trim()) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Informe o nick do infrator' }) };
            if (!TIPOS_VALIDOS.includes(tipo_denuncia)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Tipo de denúncia inválido' }) };
            if (!descricao?.trim() || descricao.length < 20) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Descreva o ocorrido (mínimo 20 caracteres)' }) };

            let evidencia_url = null;

            if (evidencia_base64 && evidencia_tipo) {
                const ext      = evidencia_tipo === 'video' ? 'mp4' : 'jpg';
                const mimeType = evidencia_tipo === 'video' ? 'video/mp4' : 'image/jpeg';
                const fileName = `${usuario.id}_${Date.now()}.${ext}`;
                evidencia_url  = await uploadEvidencia(evidencia_base64, mimeType, fileName);
            }

            // Buscar nick atual do denunciante
            const mems = await sb(`/membros?id=eq.${usuario.id}&select=nick`);
            const nickDenunciante = mems?.[0]?.nick || usuario.nick;

            const created = await sb('/denuncias', {
                method: 'POST',
                body: JSON.stringify({
                    denunciante_id:   usuario.id,
                    nick_denunciante: nickDenunciante,
                    nick_denunciado:  nick_denunciado.trim(),
                    tipo_denuncia,
                    descricao:        descricao.trim(),
                    evidencia_url,
                    evidencia_tipo:   evidencia_tipo || null,
                    status:           'pendente'
                })
            });

            return { statusCode: 201, headers: CORS, body: JSON.stringify({
                id: created[0].id,
                status: 'pendente',
                mensagem: 'Denúncia registrada! Os administradores irão analisar.'
            })};
        }

        // ── GET / — listar minhas denúncias ───────────────────
        if (method === 'GET' && (path === '' || path === '/')) {
            const minhas = await sb(`/denuncias?denunciante_id=eq.${usuario.id}&order=created_at.desc&select=id,nick_denunciado,tipo_denuncia,status,admin_nota,created_at`);
            return { statusCode: 200, headers: CORS, body: JSON.stringify(minhas || []) };
        }

        // ── GET /admin — listar todas (admin) ─────────────────
        if (method === 'GET' && path === '/admin') {
            if (!usuario.isAdmin) return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Apenas admins' }) };
            const todas = await sb('/denuncias?order=created_at.desc&select=*');
            return { statusCode: 200, headers: CORS, body: JSON.stringify(todas || []) };
        }

        // ── PATCH /:id — atualizar status (admin) ─────────────
        const matchPatch = path.match(/^\/([0-9a-f-]+)$/);
        if (method === 'PATCH' && matchPatch) {
            if (!usuario.isAdmin) return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Apenas admins' }) };

            const denunciaId = matchPatch[1];
            const { status, admin_nota } = JSON.parse(event.body || '{}');

            const statusValidos = ['pendente','analisando','resolvido','arquivado'];
            if (!statusValidos.includes(status)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Status inválido' }) };

            const updated = await sb(`/denuncias?id=eq.${denunciaId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status,
                    admin_nota: admin_nota || null,
                    admin_id:   usuario.id,
                    resolvido_em: ['resolvido','arquivado'].includes(status) ? new Date().toISOString() : null
                })
            });

            // Notificar o denunciante se resolvido
            if (['resolvido','arquivado'].includes(status) && updated?.[0]?.denunciante_id) {
                await sb('/notificacoes', {
                    method: 'POST',
                    body: JSON.stringify({
                        membro_id: updated[0].denunciante_id,
                        titulo: status === 'resolvido' ? '✅ Denúncia Resolvida' : '📁 Denúncia Arquivada',
                        mensagem: admin_nota || 'Sua denúncia foi analisada pelos administradores.',
                        tipo: 'denuncia',
                        referencia_id: denunciaId
                    })
                }).catch(() => {});
            }

            return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, status }) };
        }

        return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Endpoint não encontrado' }) };

    } catch (err) {
        console.error('[fac-denuncia] Erro:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Erro interno: ' + err.message }) };
    }
};
