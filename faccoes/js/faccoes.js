/**
 * OneCheck RP — Sistema de Facções
 * Lógica de CRUD de facções + gestão de membros
 * Funciona em modo DEMO (localStorage) ou Supabase
 */

// ─────────────────────────────────────────────────────────────
// DEMO: armazenamento local
// ─────────────────────────────────────────────────────────────
const DemoStore = {
    getFaccoes: () => JSON.parse(localStorage.getItem('fac_faccoes') || '[]'),
    saveFaccoes: (data) => localStorage.setItem('fac_faccoes', JSON.stringify(data)),

    getMensagens: (faccaoId) => {
        const all = JSON.parse(localStorage.getItem('fac_msgs_' + faccaoId) || '[]');
        return all;
    },
    saveMensagem: (faccaoId, msg) => {
        const all = DemoStore.getMensagens(faccaoId);
        all.push(msg);
        // Manter só últimas 200 mensagens
        if (all.length > 200) all.splice(0, all.length - 200);
        localStorage.setItem('fac_msgs_' + faccaoId, JSON.stringify(all));
    },

    getSessao: () => JSON.parse(sessionStorage.getItem('fac_sessao') || 'null'),
    saveSessao: (dados) => sessionStorage.setItem('fac_sessao', JSON.stringify(dados)),
    clearSessao: () => sessionStorage.removeItem('fac_sessao'),
};

// ─────────────────────────────────────────────────────────────
// FACHADA: funções que funcionam em DEMO e Supabase
// ─────────────────────────────────────────────────────────────

/**
 * Buscar todas as facções
 */
async function buscarFaccoes() {
    if (window.FACCAO_DEMO) {
        return DemoStore.getFaccoes();
    }
    const db = window.getSupabase();
    const { data, error } = await db
        .from('faccoes')
        .select('*')
        .eq('ativo', true)
        .order('nome');
    if (error) throw error;
    return data;
}

/**
 * Criar nova facção
 */
async function criarFaccao({ nome, tag, descricao, cor, icone, senha }) {
    nome = nome.trim();
    tag  = tag.trim().toUpperCase();

    if (!nome || nome.length < 3) throw new Error('Nome muito curto (mínimo 3 caracteres)');
    if (!tag  || tag.length  < 2) throw new Error('TAG muito curta (mínimo 2 caracteres)');

    if (window.FACCAO_DEMO) {
        const lista = DemoStore.getFaccoes();
        if (lista.find(f => f.nome.toLowerCase() === nome.toLowerCase()))
            throw new Error('Já existe uma facção com esse nome');

        const nova = {
            id: 'demo_' + Date.now(),
            nome, tag, descricao, cor: cor || '#3b82f6',
            icone: icone || '🏴',
            senha_hash: senha ? btoa(senha) : null,
            membros_count: 0,
            criado_em: new Date().toISOString(),
            ativo: true
        };
        lista.push(nova);
        DemoStore.saveFaccoes(lista);
        return nova;
    }

    const db = window.getSupabase();
    const payload = { nome, tag, descricao, cor: cor || '#3b82f6', icone: icone || '🏴' };
    if (senha) payload.senha_hash = btoa(senha); // simplificado; use bcrypt em prod

    const { data, error } = await db.from('faccoes').insert(payload).select().single();
    if (error) throw error;

    // Mensagem de sistema
    await db.from('mensagens').insert({
        faccao_id: data.id,
        apelido: 'Sistema',
        cargo: 'Sistema',
        conteudo: `🏴 Facção "${nome}" criada!`,
        tipo: 'sistema'
    });

    return data;
}

/**
 * Entrar em uma facção (verificar senha e criar/recuperar membro)
 */
async function entrarFaccao({ faccaoId, apelido, senha }) {
    apelido = apelido.trim();
    if (!apelido || apelido.length < 2) throw new Error('Apelido muito curto');

    if (window.FACCAO_DEMO) {
        const lista   = DemoStore.getFaccoes();
        const faccao  = lista.find(f => f.id === faccaoId);
        if (!faccao) throw new Error('Facção não encontrada');

        if (faccao.senha_hash && btoa(senha || '') !== faccao.senha_hash)
            throw new Error('Senha incorreta');

        const sessao = {
            faccaoId,
            faccaoNome: faccao.nome,
            faccaoCor:  faccao.cor,
            faccaoIcone: faccao.icone,
            membroId: 'demo_m_' + Date.now(),
            apelido,
            cargo: 'Membro',
            entrou_em: new Date().toISOString()
        };
        DemoStore.saveSessao(sessao);

        // Mensagem de entrada
        DemoStore.saveMensagem(faccaoId, {
            id: 'sys_' + Date.now(),
            faccao_id: faccaoId,
            apelido: 'Sistema',
            cargo: 'Sistema',
            conteudo: `👋 ${apelido} entrou na facção`,
            tipo: 'sistema',
            criado_em: new Date().toISOString()
        });

        return sessao;
    }

    const db = window.getSupabase();
    const { data: faccao, error: fe } = await db
        .from('faccoes').select('*').eq('id', faccaoId).single();
    if (fe) throw new Error('Facção não encontrada');
    if (faccao.senha_hash && btoa(senha || '') !== faccao.senha_hash)
        throw new Error('Senha incorreta');

    // Criar ou recuperar membro
    let { data: membro } = await db.from('membros')
        .select('*').eq('faccao_id', faccaoId).eq('apelido', apelido).single();

    if (!membro) {
        const { data: novo, error: me } = await db.from('membros')
            .insert({ faccao_id: faccaoId, apelido, cargo: 'Membro' })
            .select().single();
        if (me) throw me;
        membro = novo;
    }

    // Marcar online
    await db.from('membros').update({ online: true, ultimo_acesso: new Date().toISOString() })
        .eq('id', membro.id);

    // Mensagem de entrada
    await db.from('mensagens').insert({
        faccao_id: faccaoId,
        membro_id: membro.id,
        apelido, cargo: membro.cargo,
        conteudo: `👋 ${apelido} entrou na facção`,
        tipo: 'sistema'
    });

    const sessao = {
        faccaoId,
        faccaoNome: faccao.nome,
        faccaoCor:  faccao.cor,
        faccaoIcone: faccao.icone,
        membroId: membro.id,
        apelido,
        cargo: membro.cargo,
        entrou_em: new Date().toISOString()
    };
    DemoStore.saveSessao(sessao);
    return sessao;
}

/**
 * Sair da facção
 */
async function sairFaccao() {
    const sessao = DemoStore.getSessao();
    if (!sessao) return;

    if (!window.FACCAO_DEMO) {
        const db = window.getSupabase();
        await db.from('membros').update({ online: false }).eq('id', sessao.membroId);
        await db.from('sessoes_voz').delete().eq('membro_id', sessao.membroId);
        await db.from('mensagens').insert({
            faccao_id: sessao.faccaoId,
            membro_id: sessao.membroId,
            apelido: sessao.apelido,
            cargo: sessao.cargo,
            conteudo: `👋 ${sessao.apelido} saiu da facção`,
            tipo: 'sistema'
        });
    }

    DemoStore.clearSessao();
}

// Exportar
window.FaccaoStore   = DemoStore;
window.buscarFaccoes = buscarFaccoes;
window.criarFaccao   = criarFaccao;
window.entrarFaccao  = entrarFaccao;
window.sairFaccao    = sairFaccao;
