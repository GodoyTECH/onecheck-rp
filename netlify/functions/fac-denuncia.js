/**
 * GoddoY RK — fac-denuncia.js
 * Sistema de denúncias com evidências (foto/vídeo até 30s) via Netlify Blobs
 */
const { getDb }          = require('./utils/db');
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');
const { getStore }       = require('@netlify/blobs');

const TIPOS_VALIDOS = ['dm_sem_motivo','rdm_na_rua','taser_veiculo',
                       'invasao_territorio','desrespeito_toxicidade',
                       'contra_integrante','outro'];

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const payload = verificarToken(extrairToken(event));
    if (!payload) return erro('Não autorizado', 401);

    const sql = getDb();
    const sub = (event.path.replace(/.*\/fac-denuncia\/?/, '') || '').split('?')[0];

    try {
        // ── POST / — criar denúncia ───────────────────────────
        if (event.httpMethod === 'POST' && sub === '') {
            const { nick_denunciado, tipo_denuncia, descricao, evidencia_base64, evidencia_tipo } = JSON.parse(event.body || '{}');

            if (!nick_denunciado?.trim()) return erro('Informe o nick do infrator');
            if (!TIPOS_VALIDOS.includes(tipo_denuncia)) return erro('Tipo de infração inválido');
            if (!descricao?.trim() || descricao.trim().length < 20) return erro('Descrição insuficiente (mínimo 20 caracteres)');

            let evidencia_url = null;
            if (evidencia_base64 && evidencia_tipo) {
                const ext    = evidencia_tipo === 'video' ? 'mp4' : 'jpg';
                const mime   = evidencia_tipo === 'video' ? 'video/mp4' : 'image/jpeg';
                const buffer = Buffer.from(evidencia_base64.split(',')[1] || evidencia_base64, 'base64');
                if (buffer.length > 52_428_800) return erro('Arquivo muito grande (máx 50 MB)');
                const store  = getStore({ name: 'denuncias', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
                const key    = `${payload.id}_${Date.now()}.${ext}`;
                await store.set(key, buffer, { metadata: { contentType: mime } });
                evidencia_url = `/.netlify/functions/fac-denuncia/evidencia/${key}`;
            }

            const mem = await sql`SELECT nick FROM membros WHERE id = ${payload.id} LIMIT 1`;
            const rows = await sql`
                INSERT INTO denuncias (denunciante_id, nick_denunciante, nick_denunciado, tipo_denuncia, descricao, evidencia_url, evidencia_tipo)
                VALUES (${payload.id}, ${mem[0]?.nick || payload.nick}, ${nick_denunciado.trim()},
                        ${tipo_denuncia}, ${descricao.trim()}, ${evidencia_url}, ${evidencia_tipo || null})
                RETURNING id, status`;

            return ok({ id: rows[0].id, status: 'pendente', mensagem: 'Denúncia registrada! Os admins irão analisar em breve.' }, 201);
        }

        // ── GET / — minhas denúncias ──────────────────────────
        if (event.httpMethod === 'GET' && sub === '') {
            const rows = await sql`
                SELECT id, nick_denunciado, tipo_denuncia, status, admin_nota, created_at
                FROM denuncias WHERE denunciante_id = ${payload.id}
                ORDER BY created_at DESC`;
            return ok(rows);
        }

        // ── GET /admin — todas as denúncias (admin) ───────────
        if (event.httpMethod === 'GET' && sub === 'admin') {
            if (!payload.isAdmin) return erro('Apenas admins', 403);
            const rows = await sql`SELECT * FROM denuncias ORDER BY created_at DESC LIMIT 100`;
            return ok(rows);
        }

        // ── GET /evidencia/:key — servir evidência (admin) ────
        if (event.httpMethod === 'GET' && sub.startsWith('evidencia/')) {
            if (!payload.isAdmin) return erro('Apenas admins podem ver evidências', 403);
            const key   = sub.replace('evidencia/', '');
            const store = getStore({ name: 'denuncias', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
            const meta  = await store.getMetadata(key).catch(() => null);
            const blob  = await store.get(key, { type: 'arrayBuffer' }).catch(() => null);
            if (!blob) return erro('Evidência não encontrada', 404);
            return {
                statusCode: 200,
                headers: { 'Content-Type': meta?.metadata?.contentType || 'application/octet-stream' },
                body: Buffer.from(blob).toString('base64'),
                isBase64Encoded: true
            };
        }

        // ── PATCH /:id — atualizar status (admin) ─────────────
        const matchId = sub.match(/^([0-9a-f-]+)$/);
        if (event.httpMethod === 'PATCH' && matchId) {
            if (!payload.isAdmin) return erro('Apenas admins', 403);
            const { status, admin_nota } = JSON.parse(event.body || '{}');
            const statusValidos = ['pendente','analisando','resolvido','arquivado'];
            if (!statusValidos.includes(status)) return erro('Status inválido');

            const rows = await sql`
                UPDATE denuncias
                SET status = ${status}, admin_nota = ${admin_nota || null},
                    admin_id = ${payload.id},
                    resolvido_em = ${['resolvido','arquivado'].includes(status) ? new Date().toISOString() : null}
                WHERE id = ${matchId[1]}
                RETURNING denunciante_id, nick_denunciado`;

            if (rows.length && ['resolvido','arquivado'].includes(status)) {
                const emoji = status === 'resolvido' ? '✅' : '📁';
                await sql`
                    INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo, referencia_id)
                    VALUES (${rows[0].denunciante_id},
                        ${emoji + ' Denúncia ' + (status === 'resolvido' ? 'Resolvida' : 'Arquivada')},
                        ${admin_nota || 'Sua denúncia foi analisada pelos administradores.'},
                        'denuncia', ${matchId[1]})`;
            }

            return ok({ ok: true, status });
        }

        return erro('Endpoint não encontrado', 404);
    } catch (e) {
        console.error('[fac-denuncia]', e.message);
        return erro('Erro interno: ' + e.message, 500);
    }
};
