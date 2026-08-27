// GoddoY RK — js/components.js
// Componentes reutilizáveis de UI — retornam strings HTML ou elementos DOM

window.GRK = {
    getInitials(nick) {
        if (!nick) return '??';
        return nick.substring(0, 2).toUpperCase();
    },

    avatar(nick, size = 'md', avatarUrl = null, online = false) {
        const initials = this.getInitials(nick);
        const onlineClass = online ? 'avatar-online' : '';
        const content = avatarUrl 
            ? `<img src="${avatarUrl}" alt="${nick}">`
            : `<span>${initials}</span>`;
            
        return `<div class="avatar avatar-${size} ${onlineClass}">${content}</div>`;
    },

    levelBadge(nivel) {
        return `<span class="level-badge">Nv <strong>${nivel || 1}</strong></span>`;
    },

    xpBar(current, max, animated = true) {
        const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
        const transition = animated ? 'transition: width 0.3s ease;' : '';
        return `
            <div class="xp-bar-wrap">
                <div class="xp-bar">
                    <div class="xp-bar-fill" style="width: ${pct}%; ${transition}"></div>
                </div>
                <div class="xp-numbers">${current}/${max} XP</div>
            </div>
        `;
    },

    cargoBadge(cargo) {
        const c = (cargo || 'Membro').toLowerCase();
        let colorClass = 'badge-gray';
        if (c.includes('lider') || c.includes('líder')) colorClass = 'badge-red';
        else if (c.includes('gerente')) colorClass = 'badge-orange';
        else if (c.includes('oficial')) colorClass = 'badge-blue';
        
        return `<span class="badge badge-cargo ${colorClass}">${cargo || 'Membro'}</span>`;
    },

    rankItem(pos, user, isMe = false, showPoints = true) {
        const meClass = isMe ? 'rank-item-me' : '';
        const posClass = pos <= 3 ? `rank-pos-${pos}` : 'rank-pos-other';
        
        return `
            <div class="rank-item ${meClass}">
                <div class="rank-pos ${posClass}">${pos}</div>
                ${this.avatar(user.nick, 'sm', user.avatar_url, user.online)}
                <div class="rank-info">
                    <div class="rank-name">${user.nick} ${this.cargoBadge(user.cargo)}</div>
                    ${this.levelBadge(user.nivel)}
                </div>
                ${showPoints ? `<div class="rank-points">${this.formatPts(user.pontos)} pts</div>` : ''}
            </div>
        `;
    },

    chatMessage(msg, isMe = false) {
        const meClass = isMe ? 'chat-msg-me' : '';
        const time = this.timeAgo(msg.created_at);
        
        let contentHtml = '';
        if (msg.tipo === 'audio') {
            contentHtml = `<audio controls src="${msg.conteudo}" class="chat-audio"></audio>`;
        } else {
            contentHtml = `<div class="chat-text">${msg.conteudo}</div>`;
        }

        return `
            <div class="chat-msg ${meClass}">
                ${!isMe ? this.avatar(msg.autor_nick, 'sm', msg.autor_avatar) : ''}
                <div class="chat-msg-body">
                    ${!isMe ? `<div class="chat-msg-author">${msg.autor_nick} <span class="chat-msg-time">${time}</span></div>` : `<div class="chat-msg-time">${time}</div>`}
                    <div class="chat-msg-content">${contentHtml}</div>
                </div>
            </div>
        `;
    },

    missionCard(tarefa, euConclui = false) {
        const statusClass = euConclui ? 'mission-done' : '';
        return `
            <div class="mission-card ${statusClass}">
                <div class="mission-info">
                    <h4 class="mission-title">${tarefa.titulo}</h4>
                    <p class="mission-desc">${tarefa.descricao}</p>
                </div>
                <div class="mission-reward">
                    <span class="mission-pts">+${tarefa.pontos} XP</span>
                    ${euConclui ? '<span class="mission-check">✓</span>' : ''}
                </div>
            </div>
        `;
    },

    achievementCard(conquista, unlocked = false) {
        const statusClass = unlocked ? 'achiev-unlocked' : 'achiev-locked';
        return `
            <div class="achievement-card ${statusClass}">
                <div class="achiev-icon">${conquista.icon || '🏆'}</div>
                <div class="achiev-title">${conquista.titulo}</div>
                <div class="achiev-desc">${conquista.descricao}</div>
            </div>
        `;
    },

    convItem(conv) {
        const time = this.timeAgo(conv.last_msg_ts);
        const unreadClass = conv.unread_count > 0 ? 'conv-unread' : '';
        return `
            <div class="conv-item ${unreadClass}" data-id="${conv.id}">
                ${this.avatar(conv.outro_nick, 'md', conv.outro_avatar, conv.outro_online)}
                <div class="conv-info">
                    <div class="conv-header">
                        <span class="conv-name">${conv.outro_nick}</span>
                        <span class="conv-time">${time}</span>
                    </div>
                    <div class="conv-lastmsg">${conv.last_msg}</div>
                </div>
                ${conv.unread_count > 0 ? `<div class="conv-badge">${conv.unread_count}</div>` : ''}
            </div>
        `;
    },

    skeletonCard(lines = 3) {
        let linesHtml = '';
        for(let i=0; i<lines; i++) {
            linesHtml += `<div class="skel-line" style="width: ${Math.random() * 40 + 40}%"></div>`;
        }
        return `
            <div class="skeleton-card">
                <div class="skel-avatar"></div>
                <div class="skel-content">
                    ${linesHtml}
                </div>
            </div>
        `;
    },

    emptyState(icon, title, desc, btnText = '', btnAction = '') {
        const btnHtml = btnText ? `<button class="btn btn-primary" onclick="${btnAction}">${btnText}</button>` : '';
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <h3 class="empty-title">${title}</h3>
                <p class="empty-desc">${desc}</p>
                ${btnHtml}
            </div>
        `;
    },

    toast(msg, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<div class="toast-content">${msg}</div>`;
        
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // Trigger reflow for animation
        toast.offsetHeight;
        toast.classList.add('toast-show');
        
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    timeAgo(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);
        
        if (diffSec < 60) return 'agora';
        if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
        if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)}h`;
        return `há ${Math.floor(diffSec / 86400)} dias`;
    },

    notifItem(notif) {
        const unreadClass = !notif.lida ? 'notif-unread' : '';
        const time = this.timeAgo(notif.created_at);
        return `
            <div class="notif-item ${unreadClass}" data-id="${notif.id}">
                <div class="notif-content">${notif.conteudo}</div>
                <div class="notif-time">${time}</div>
            </div>
        `;
    },

    formatPts(num) {
        if (num === undefined || num === null) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    modal(title, content, footer = '') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modalBody = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;
        
        overlay.innerHTML = modalBody;
        document.body.appendChild(overlay);
        
        // Animation
        overlay.offsetHeight;
        overlay.classList.add('modal-show');
        
        const closeFn = () => {
            overlay.classList.remove('modal-show');
            setTimeout(() => overlay.remove(), 300);
        };
        
        overlay.querySelector('.modal-close').addEventListener('click', closeFn);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeFn();
        });
        
        return closeFn;
    },

    confirm(message, onConfirm) {
        const footer = `
            <button class="btn btn-secondary" id="confirm-btn-cancel">Cancelar</button>
            <button class="btn btn-primary" id="confirm-btn-ok">Confirmar</button>
        `;
        const closeFn = this.modal('Confirmação', `<p>${message}</p>`, footer);
        
        document.getElementById('confirm-btn-cancel').addEventListener('click', closeFn);
        document.getElementById('confirm-btn-ok').addEventListener('click', () => {
            onConfirm();
            closeFn();
        });
    }
};
