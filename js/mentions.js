/**
 * GoddoY RK — js/mentions.js
 * Módulo de Menções Inteligentes (@) para Chat Geral e DM
 */

'use strict';

const MENTIONS = (() => {
    let menuEl, listEl;
    let currentInput = null;
    let searchString = '';
    let mentionStartIndex = -1;
    let selectedIndex = 0;
    let filteredMembers = [];
    let allMembers = [];

    function init() {
        menuEl = document.getElementById('mentionsAutocomplete');
        listEl = document.getElementById('mentionsList');
        
        if (!menuEl || !listEl) return;

        // Escuta os inputs de chat
        const chatInput = document.getElementById('chatInput');
        const dmInput = document.getElementById('dmInput');

        if (chatInput) {
            chatInput.addEventListener('input', e => handleInput(e, chatInput));
            chatInput.addEventListener('keydown', e => handleKeydown(e, chatInput));
        }
        if (dmInput) {
            dmInput.addEventListener('input', e => handleInput(e, dmInput));
            dmInput.addEventListener('keydown', e => handleKeydown(e, dmInput));
        }

        // Carregar membros para cache (a cada init ou atualização)
        loadMembers();
    }

    async function loadMembers() {
        try {
            // Em vez de bater na API sempre, vamos tentar usar o window.STATE ou recarregar
            const membros = await window.API.getMembros(); 
            // Filtra pendentes e a si mesmo (opcional, mas permitiremos mencionar a todos menos pendentes)
            allMembers = membros.filter(m => m.cargo !== 'Pendente' && m.id !== window.STATE.getUser()?.id);
        } catch (e) {
            console.warn('Mentions: Erro ao carregar membros', e);
        }
    }

    function handleInput(e, inputEl) {
        currentInput = inputEl;
        const val = inputEl.value;
        const cursor = inputEl.selectionStart;
        
        // Pega o texto do início até o cursor
        const textBeforeCursor = val.slice(0, cursor);
        
        // Encontra o último '@' antes do cursor
        const lastAt = textBeforeCursor.lastIndexOf('@');
        
        // Regra: tem que ter um @, e antes dele deve ser espaço ou início da string
        if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ' || val[lastAt - 1] === '\n')) {
            // Extrai o texto de busca (ex: '@cai' -> 'cai')
            searchString = textBeforeCursor.slice(lastAt + 1);
            
            // Se tiver espaço depois do '@', abortar (ex: "@ cai")
            if (searchString.includes(' ')) {
                closeMenu();
                return;
            }

            mentionStartIndex = lastAt;
            showMenu(searchString);
        } else {
            closeMenu();
        }
    }

    function handleKeydown(e, inputEl) {
        if (menuEl.classList.contains('hidden')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, filteredMembers.length - 1);
            renderList();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            renderList();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredMembers[selectedIndex]) {
                selectMember(filteredMembers[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            closeMenu();
        }
    }

    function showMenu(query) {
        query = query.toLowerCase();
        
        // Filtrar (nome, nick)
        filteredMembers = allMembers.filter(m => 
            m.nick.toLowerCase().includes(query)
        ).slice(0, 10); // Limita a 10 resultados

        if (filteredMembers.length === 0) {
            closeMenu();
            return;
        }

        selectedIndex = 0;
        renderList();

        // Posicionamento acima do input
        const inputRect = currentInput.getBoundingClientRect();
        // Um cálculo simples: posiciona logo acima do campo
        
        // Position globally using fixed coordinates
        const inputRect = currentInput.getBoundingClientRect();
        
        // Convert to absolute fixed positions
        menuEl.style.position = 'fixed';
        menuEl.style.left = inputRect.left + 'px';
        menuEl.style.width = inputRect.width + 'px';
        menuEl.style.bottom = (window.innerHeight - inputRect.top + 8) + 'px'; // 8px spacing
        menuEl.style.top = 'auto'; // ensure top is not set

        menuEl.classList.remove('hidden');
    }

    function renderList() {
        listEl.innerHTML = filteredMembers.map((m, idx) => `
            <div class="mentions-item ${idx === selectedIndex ? 'selected' : ''}" data-idx="${idx}">
                <div class="avatar">${window.GRK.getInitials(m.nick)}</div>
                <div class="mentions-info">
                    <div class="mentions-name">
                        <div class="online-dot" style="background: ${m.is_ativo ? 'var(--online)' : 'var(--offline)'};"></div>
                        ${m.nick}
                    </div>
                    <div class="mentions-cargo">${m.cargo}</div>
                </div>
            </div>
        `).join('');

        // Eventos de clique nas opções
        listEl.querySelectorAll('.mentions-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Evita perder foco do input
                const idx = parseInt(item.dataset.idx, 10);
                selectMember(filteredMembers[idx]);
            });
            item.addEventListener('mouseenter', () => {
                selectedIndex = parseInt(item.dataset.idx, 10);
                renderList(); // Atualiza a seleção visual
            });
        });

        // Scroll para o selecionado
        const selectedEl = listEl.querySelector('.selected');
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest' });
        }
    }

    function selectMember(member) {
        if (!currentInput || mentionStartIndex === -1) return;

        const val = currentInput.value;
        const textBefore = val.slice(0, mentionStartIndex);
        // O texto depois deve continuar de onde o cursor estava
        const cursor = currentInput.selectionStart;
        const textAfter = val.slice(cursor);

        // Insere o nick com um espaço logo depois
        const insertText = `@${member.nick} `;
        
        currentInput.value = textBefore + insertText + textAfter;
        
        // Foca e posiciona o cursor após a menção inserida
        currentInput.focus();
        currentInput.setSelectionRange(textBefore.length + insertText.length, textBefore.length + insertText.length);

        closeMenu();
    }

    function closeMenu() {
        menuEl?.classList.add('hidden');
        searchString = '';
        mentionStartIndex = -1;
        selectedIndex = 0;
    }

    function formatMentions(text) {
        if (!text) return text;
        // Regex para capturar palavras que começam com @ e contém letras, números ou underscores
        // O backend garantirá que os Nicks batam com os usuários
        return text.replace(/@([A-Za-z0-9_]+)/g, (match, nick) => {
            return `<span class="mention-tag" onclick="abrirPerfilMencao('${nick}')">${match}</span>`;
        });
    }

    // Função exposta no escopo global para o onclick
    window.abrirPerfilMencao = async function(nick) {
        if (!allMembers.length) await loadMembers();
        const m = allMembers.find(x => x.nick.toLowerCase() === nick.toLowerCase());
        if (m) {
            // Utiliza a função global viewMembroPerfil já existente em platform.js
            if(typeof window.viewMembroPerfil === 'function') {
                window.viewMembroPerfil(m.id);
            }
        } else {
            window.GRK.toast('Usuário não encontrado', 'error');
        }
    };

    return { init, loadMembers, formatMentions };
})();

window.MENTIONS = MENTIONS;
