/**
 * OneCheck RP — Sistema de Facções
 * Chat de Voz via WebRTC + PeerJS
 * Funciona peer-to-peer entre os membros do canal de voz
 */

let peer         = null;
let localStream  = null;
let connections  = {};   // peerId → MediaConnection
let muted        = false;
let noCanal      = false;
let onVozUpdate  = null; // callback quando lista de usuários muda

// ─────────────────────────────────────────────────────────────
// ENTRAR NO CANAL DE VOZ
// ─────────────────────────────────────────────────────────────
async function entrarCanalVoz(faccaoId, apelido, onUpdate) {
    if (noCanal) return;
    onVozUpdate = onUpdate;

    try {
        // 1. Pegar acesso ao microfone
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        noCanal = true;

        // 2. Criar peer com ID único
        const peerId = `fac_${faccaoId}_${apelido}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        peer = new Peer(peerId, {
            // Usa servidores gratuitos do PeerJS para sinalização
            host: '0.peerjs.com',
            port: 443,
            path: '/',
            secure: true,
            debug: 0,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun.stunprotocol.org:3478' }
                ]
            }
        });

        peer.on('open', async (id) => {
            console.log('[Voz] Peer aberto:', id);

            // 3. Registrar no Supabase (ou sessão demo)
            await registrarSessaoVoz(faccaoId, apelido, id);

            // 4. Buscar outros peers e conectar
            const outros = await buscarPeersVoz(faccaoId);
            for (const outro of outros) {
                if (outro.peer_id && outro.peer_id !== id) {
                    conectarAoPeer(outro.peer_id);
                }
            }

            if (onVozUpdate) onVozUpdate(await buscarPeersVoz(faccaoId));
        });

        // 5. Aceitar chamadas recebidas
        peer.on('call', (call) => {
            call.answer(localStream);
            call.on('stream', (remoteStream) => {
                reproduzirAudio(remoteStream, call.peer);
            });
            call.on('close', () => {
                removerAudio(call.peer);
            });
            connections[call.peer] = call;
        });

        peer.on('error', (err) => {
            console.error('[Voz] Erro PeerJS:', err);
        });

    } catch (err) {
        noCanal = false;
        if (err.name === 'NotAllowedError')
            throw new Error('Permissão de microfone negada. Habilite o microfone no navegador.');
        throw new Error('Erro ao acessar microfone: ' + err.message);
    }
}

// ─────────────────────────────────────────────────────────────
// CONECTAR A OUTRO PEER
// ─────────────────────────────────────────────────────────────
function conectarAoPeer(remotePeerId) {
    if (!peer || !localStream) return;
    if (connections[remotePeerId]) return;

    const call = peer.call(remotePeerId, localStream);
    if (!call) return;

    call.on('stream', (remoteStream) => {
        reproduzirAudio(remoteStream, remotePeerId);
    });
    call.on('close', () => {
        removerAudio(remotePeerId);
    });
    connections[remotePeerId] = call;
}

// ─────────────────────────────────────────────────────────────
// REPRODUZIR ÁUDIO REMOTO
// ─────────────────────────────────────────────────────────────
function reproduzirAudio(stream, peerId) {
    const audioId = 'audio_peer_' + peerId.replace(/[^a-z0-9]/gi, '_');
    let el = document.getElementById(audioId);
    if (!el) {
        el = document.createElement('audio');
        el.id = audioId;
        el.autoplay = true;
        document.body.appendChild(el);
    }
    el.srcObject = stream;
}

function removerAudio(peerId) {
    const audioId = 'audio_peer_' + peerId.replace(/[^a-z0-9]/gi, '_');
    const el = document.getElementById(audioId);
    if (el) el.remove();
    delete connections[peerId];
}

// ─────────────────────────────────────────────────────────────
// MUTE / UNMUTE
// ─────────────────────────────────────────────────────────────
function toggleMute() {
    if (!localStream) return muted;
    muted = !muted;
    localStream.getAudioTracks().forEach(track => { track.enabled = !muted; });
    return muted;
}

// ─────────────────────────────────────────────────────────────
// SAIR DO CANAL DE VOZ
// ─────────────────────────────────────────────────────────────
async function sairCanalVoz(faccaoId) {
    if (!noCanal) return;
    noCanal = false;

    // Fechar todas as conexões
    Object.values(connections).forEach(call => { try { call.close(); } catch(e) {} });
    connections = {};

    // Parar microfone
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }

    // Destruir peer
    if (peer) { try { peer.destroy(); } catch(e) {} peer = null; }

    // Remover áudios do DOM
    document.querySelectorAll('audio[id^="audio_peer_"]').forEach(el => el.remove());

    // Remover do Supabase
    await removerSessaoVoz(faccaoId);

    muted = false;
    if (onVozUpdate) onVozUpdate([]);
}

// ─────────────────────────────────────────────────────────────
// SUPABASE / DEMO: sessões de voz
// ─────────────────────────────────────────────────────────────
async function registrarSessaoVoz(faccaoId, apelido, peerId) {
    if (window.FACCAO_DEMO) {
        const sessoes = JSON.parse(sessionStorage.getItem('voz_sessoes_' + faccaoId) || '[]');
        sessoes.push({ apelido, peer_id: peerId, mutado: false });
        sessionStorage.setItem('voz_sessoes_' + faccaoId, JSON.stringify(sessoes));
        return;
    }
    const db = window.getSupabase();
    const sessao = window.FaccaoStore.getSessao();
    await db.from('sessoes_voz').upsert({
        faccao_id: faccaoId,
        membro_id: sessao.membroId,
        apelido, peer_id: peerId, mutado: false
    }, { onConflict: 'membro_id' });
}

async function removerSessaoVoz(faccaoId) {
    if (window.FACCAO_DEMO) {
        sessionStorage.removeItem('voz_sessoes_' + faccaoId);
        return;
    }
    const db = window.getSupabase();
    const sessao = window.FaccaoStore.getSessao();
    if (sessao) await db.from('sessoes_voz').delete().eq('membro_id', sessao.membroId);
}

async function buscarPeersVoz(faccaoId) {
    if (window.FACCAO_DEMO) {
        return JSON.parse(sessionStorage.getItem('voz_sessoes_' + faccaoId) || '[]');
    }
    const db = window.getSupabase();
    const { data } = await db.from('sessoes_voz')
        .select('apelido, peer_id, mutado')
        .eq('faccao_id', faccaoId);
    return data || [];
}

// Estado público
Object.defineProperty(window, 'vozNoCanal',  { get: () => noCanal });
Object.defineProperty(window, 'vozMutado',   { get: () => muted  });

// Exportar
window.entrarCanalVoz = entrarCanalVoz;
window.sairCanalVoz   = sairCanalVoz;
window.toggleMute     = toggleMute;
window.buscarPeersVoz = buscarPeersVoz;
