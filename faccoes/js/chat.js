/**
 * OneCheck RP — Sistema de Facções
 * Chat em Tempo Real + Mensagens de Áudio
 * Modo DEMO: localStorage com polling a cada 2s
 * Modo Supabase: Realtime subscriptions
 */

let chatSubscription = null;
let pollingInterval  = null;
let onNovaMsg        = null;   // callback externo

// ─────────────────────────────────────────────────────────────
// CARREGAR HISTÓRICO
// ─────────────────────────────────────────────────────────────
async function carregarMensagens(faccaoId, limit = 50) {
    if (window.FACCAO_DEMO) {
        const msgs = window.FaccaoStore.getMensagens(faccaoId);
        return msgs.slice(-limit);
    }

    const db = window.getSupabase();
    const { data, error } = await db
        .from('mensagens')
        .select('*')
        .eq('faccao_id', faccaoId)
        .order('criado_em', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data.reverse();
}

// ─────────────────────────────────────────────────────────────
// ENVIAR MENSAGEM DE TEXTO
// ─────────────────────────────────────────────────────────────
async function enviarMensagem(faccaoId, conteudo) {
    const sessao = window.FaccaoStore.getSessao();
    if (!sessao) throw new Error('Sessão expirada');

    conteudo = conteudo.trim();
    if (!conteudo) throw new Error('Mensagem vazia');
    if (conteudo.length > window.FACCAO_CONFIG.MAX_MSG_LENGTH)
        throw new Error(`Máximo ${window.FACCAO_CONFIG.MAX_MSG_LENGTH} caracteres`);

    const msg = {
        id:        'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
        faccao_id: faccaoId,
        membro_id: sessao.membroId,
        apelido:   sessao.apelido,
        cargo:     sessao.cargo,
        conteudo,
        tipo:      'texto',
        criado_em: new Date().toISOString()
    };

    if (window.FACCAO_DEMO) {
        window.FaccaoStore.saveMensagem(faccaoId, msg);
        // Simular recebimento imediato no modo demo
        if (onNovaMsg) onNovaMsg(msg);
        return msg;
    }

    const db = window.getSupabase();
    const { data, error } = await db.from('mensagens').insert({
        faccao_id: faccaoId,
        membro_id: sessao.membroId,
        apelido:   sessao.apelido,
        cargo:     sessao.cargo,
        conteudo,
        tipo: 'texto'
    }).select().single();
    if (error) throw error;
    return data;
}

// ─────────────────────────────────────────────────────────────
// ENVIAR ÁUDIO
// ─────────────────────────────────────────────────────────────
async function enviarAudio(faccaoId, audioBlob) {
    const sessao = window.FaccaoStore.getSessao();
    if (!sessao) throw new Error('Sessão expirada');

    if (window.FACCAO_DEMO) {
        // Converter para base64 para armazenar no localStorage
        const reader = new FileReader();
        const base64 = await new Promise(resolve => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(audioBlob);
        });

        const msg = {
            id:        'audio_' + Date.now(),
            faccao_id: faccaoId,
            membro_id: sessao.membroId,
            apelido:   sessao.apelido,
            cargo:     sessao.cargo,
            conteudo:  null,
            tipo:      'audio',
            audio_url: base64,
            criado_em: new Date().toISOString()
        };
        window.FaccaoStore.saveMensagem(faccaoId, msg);
        if (onNovaMsg) onNovaMsg(msg);
        return msg;
    }

    // Supabase Storage
    const db = window.getSupabase();
    const filename = `${faccaoId}/${Date.now()}_${sessao.apelido}.webm`;
    const { data: upload, error: ue } = await db.storage
        .from('audios-faccao')
        .upload(filename, audioBlob, { contentType: 'audio/webm' });
    if (ue) throw ue;

    const { data: urlData } = db.storage.from('audios-faccao').getPublicUrl(filename);

    const { data, error } = await db.from('mensagens').insert({
        faccao_id: faccaoId,
        membro_id: sessao.membroId,
        apelido:   sessao.apelido,
        cargo:     sessao.cargo,
        tipo:      'audio',
        audio_url: urlData.publicUrl
    }).select().single();
    if (error) throw error;
    return data;
}

// ─────────────────────────────────────────────────────────────
// REALTIME: assinar canal
// ─────────────────────────────────────────────────────────────
function assinarRealtime(faccaoId, callback) {
    onNovaMsg = callback;

    if (window.FACCAO_DEMO) {
        // Modo demo: polling a cada 2s para simular tempo real
        let ultimoId = '';
        pollingInterval = setInterval(() => {
            const msgs = window.FaccaoStore.getMensagens(faccaoId);
            if (msgs.length === 0) return;
            const ultima = msgs[msgs.length - 1];
            if (ultima.id !== ultimoId) {
                ultimoId = ultima.id;
                callback(ultima);
            }
        }, 2000);
        return;
    }

    // Supabase Realtime
    const db = window.getSupabase();
    chatSubscription = db
        .channel('chat_' + faccaoId)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
            filter: `faccao_id=eq.${faccaoId}`
        }, payload => {
            if (payload.new) callback(payload.new);
        })
        .subscribe();
}

function cancelarRealtime() {
    onNovaMsg = null;
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
    if (chatSubscription) {
        const db = window.getSupabase();
        if (db) db.removeChannel(chatSubscription);
        chatSubscription = null;
    }
}

// ─────────────────────────────────────────────────────────────
// MEMBROS ONLINE
// ─────────────────────────────────────────────────────────────
async function buscarMembrosOnline(faccaoId) {
    if (window.FACCAO_DEMO) {
        const sessao = window.FaccaoStore.getSessao();
        return sessao ? [{ apelido: sessao.apelido, cargo: sessao.cargo, online: true }] : [];
    }
    const db = window.getSupabase();
    const { data } = await db.from('membros')
        .select('apelido, cargo, online, ultimo_acesso')
        .eq('faccao_id', faccaoId)
        .order('cargo_rank', { ascending: false });
    return data || [];
}

// Exportar
window.carregarMensagens  = carregarMensagens;
window.enviarMensagem     = enviarMensagem;
window.enviarAudio        = enviarAudio;
window.assinarRealtime    = assinarRealtime;
window.cancelarRealtime   = cancelarRealtime;
window.buscarMembrosOnline = buscarMembrosOnline;
