// GoddoY RK — js/api.js
// Camada de comunicação com todas as Netlify Functions
// NÃO importa AUTH diretamente — recebe headers como parâmetro ou usa AUTH.headers()

window.API = {
    isConfigured: false,

    async _fetch(url, opts = {}, requireAuth = false) {
        opts.headers = opts.headers || {};
        opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
        
        if (requireAuth && window.AUTH) {
            const authHeaders = window.AUTH.headers();
            opts.headers = { ...opts.headers, ...authHeaders };
        }

        try {
            const response = await fetch(url, opts);
            if (!response.ok) {
                let errorMsg = 'Erro na requisição';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.message || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (${url}):`, error);
            throw error;
        }
    },

    async checkConfigured() {
        try {
            await this.getConfig();
            this.isConfigured = true;
        } catch (e) {
            this.isConfigured = false;
        }
        return this.isConfigured;
    },

    // Auth
    login(nick, senha, lembrar) {
        return this._fetch('/.netlify/functions/fac-auth', {
            method: 'POST',
            body: JSON.stringify({ nick, senha, lembrar })
        });
    },
    logout() {
        return this._fetch('/.netlify/functions/fac-auth/logout', { method: 'POST' });
    },
    criarMembro(nick, cargo) {
        return this._fetch('/.netlify/functions/fac-auth/criar-membro', {
            method: 'POST',
            body: JSON.stringify({ nick, cargo })
        }, true);
    },
    resetarSenha(membro_id) { // renamed from resetarPin
        return this._fetch('/.netlify/functions/fac-auth/resetar-senha', {
            method: 'POST',
            body: JSON.stringify({ membro_id })
        }, true);
    },
    alterarSenha(senha_atual, senha_nova) {
        return this._fetch('/.netlify/functions/fac-auth/alterar-senha', {
            method: 'POST',
            body: JSON.stringify({ senha_atual, senha_nova })
        }, true);
    },
    verSenhas() {
        return this._fetch('/.netlify/functions/fac-auth/ver-senhas', {}, true);
    },

    // Membros
    getMembros(cargo) {
        const url = cargo ? `/.netlify/functions/fac-membros?cargo=${encodeURIComponent(cargo)}` : '/.netlify/functions/fac-membros';
        return this._fetch(url, {}, true);
    },
    getMe() {
        return this._fetch('/.netlify/functions/fac-membros/me', {}, true);
    },
    getRanking() {
        return this._fetch('/.netlify/functions/fac-membros/ranking', {}, true);
    },
    updateMe(data) {
        return this._fetch(`/.netlify/functions/fac-membros/${window.STATE?.user?.id || ''}/editar-perfil`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }, true);
    },
    pontuar(membro_id, pontos, motivo, acao) {
        return this._fetch('/.netlify/functions/fac-membros/pontuar', {
            method: 'POST',
            body: JSON.stringify({ membro_id, pontos, motivo, acao })
        }, true);
    },
    promover(membro_id, cargo_novo, motivo) {
        return this._fetch('/.netlify/functions/fac-membros/promover', {
            method: 'POST',
            body: JSON.stringify({ membro_id, cargo_novo, motivo })
        }, true);
    },

    // Config / Notificações
    getConfig() {
        return this._fetch('/.netlify/functions/fac-config', {}, true);
    },
    getNotificacoes() {
        return this._fetch('/.netlify/functions/fac-config/notificacoes', {}, true);
    },
    lerNotificacoes(notif_id) {
        return this._fetch('/.netlify/functions/fac-config/notificacoes/ler', {
            method: 'POST',
            body: JSON.stringify({ notif_id })
        }, true);
    },
    getConquistas() {
        return this._fetch('/.netlify/functions/fac-config/conquistas', {}, true);
    },
    saveConquistas(obj) {
        return this._fetch('/.netlify/functions/fac-config/conquistas', {
            method: 'POST',
            body: JSON.stringify(obj)
        }, true);
    },
    saveConfig(obj) {
        return this._fetch('/.netlify/functions/fac-config/config', {
            method: 'POST',
            body: JSON.stringify(obj)
        }, true);
    },

    // Chat Geral
    getChatMsgs(since) {
        const url = since ? `/.netlify/functions/fac-chat?since=${encodeURIComponent(since)}` : '/.netlify/functions/fac-chat';
        return this._fetch(url, {}, true);
    },
    sendChat(conteudo) {
        return this._fetch('/.netlify/functions/fac-chat', {
            method: 'POST',
            body: JSON.stringify({ conteudo, tipo: 'texto' })
        }, true);
    },
    sendChatAudio(audio_base64, duracao) {
        return this._fetch('/.netlify/functions/fac-chat/audio', {
            method: 'POST',
            body: JSON.stringify({ audio_base64, duracao, tipo: 'audio' })
        }, true);
    },

    // DMs
    getDMs() {
        return this._fetch('/.netlify/functions/fac-dm', {}, true);
    },
    iniciarDM(outro_id) {
        return this._fetch('/.netlify/functions/fac-dm', {
            method: 'POST',
            body: JSON.stringify({ outro_id })
        }, true);
    },
    getDMMsgs(conversa_id, since) {
        const url = since ? `/.netlify/functions/fac-dm/${conversa_id}/mensagens?since=${encodeURIComponent(since)}` : `/.netlify/functions/fac-dm/${conversa_id}/mensagens`;
        return this._fetch(url, {}, true);
    },
    sendDM(conversa_id, conteudo) {
        return this._fetch(`/.netlify/functions/fac-dm/${conversa_id}/mensagens`, {
            method: 'POST',
            body: JSON.stringify({ conteudo })
        }, true);
    },

    // Posts (Feed)
    getPosts(page) {
        const url = page ? `/.netlify/functions/fac-posts?page=${page}` : '/.netlify/functions/fac-posts';
        return this._fetch(url, {}, true);
    },
    createPost(conteudo, media_base64, media_tipo) {
        return this._fetch('/.netlify/functions/fac-posts', {
            method: 'POST',
            body: JSON.stringify({ conteudo, media_base64, media_tipo })
        }, true);
    },
    deletePost(id) {
        return this._fetch(`/.netlify/functions/fac-posts/${id}`, { method: 'DELETE' }, true);
    },
    curtirPost(id) {
        return this._fetch(`/.netlify/functions/fac-posts/${id}/curtir`, { method: 'POST' }, true);
    },
    getComentarios(post_id) {
        return this._fetch(`/.netlify/functions/fac-posts/${post_id}/comentarios`, {}, true);
    },
    sendComentario(post_id, conteudo) {
        return this._fetch(`/.netlify/functions/fac-posts/${post_id}/comentarios`, {
            method: 'POST',
            body: JSON.stringify({ conteudo })
        }, true);
    },

    // Denúncias
    criarDenuncia(data) {
        return this._fetch('/.netlify/functions/fac-denuncia', {
            method: 'POST',
            body: JSON.stringify(data)
        }, true);
    },
    getDenuncias() {
        return this._fetch('/.netlify/functions/fac-denuncia', {}, true);
    },

    // Tarefas
    getTarefas() {
        return this._fetch('/.netlify/functions/fac-tarefas', {}, true);
    },
    criarTarefa(titulo, descricao, pontos) {
        return this._fetch('/.netlify/functions/fac-tarefas', {
            method: 'POST',
            body: JSON.stringify({ titulo, descricao, pontos })
        }, true);
    },
    concluirTarefa(id) {
        return this._fetch(`/.netlify/functions/fac-tarefas/${id}/concluir`, { method: 'POST' }, true);
    },
    deletarTarefa(id) {
        return this._fetch(`/.netlify/functions/fac-tarefas/${id}`, { method: 'DELETE' }, true);
    }
};

window.API.checkConfigured();