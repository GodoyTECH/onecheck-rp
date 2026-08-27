// GoddoY RK — js/state.js
// Estado global da aplicação — simples, sem framework

window.STATE = {
    user: null,
    config: null,
    ranking: [],
    chatMsgs: [],
    chatLastTs: null,
    dmList: [],
    dmMsgs: {},
    dmLastTs: {},
    activeConversaId: null,
    notifCount: 0,
    currentView: 'home',
    
    chatPollingInterval: null,
    dmPollingInterval: null,
    notifPollingInterval: null,

    _listeners: new Map(),

    setUser(data) {
        this.user = { ...this.user, ...data };
        if (this.user.nick) {
            sessionStorage.setItem('grk_nick', this.user.nick);
        }
        this.emit('user:update', this.user);
    },

    clear() {
        this.user = null;
        this.config = null;
        this.ranking = [];
        this.chatMsgs = [];
        this.chatLastTs = null;
        this.dmList = [];
        this.dmMsgs = {};
        this.dmLastTs = {};
        this.activeConversaId = null;
        this.notifCount = 0;
        this.currentView = 'home';
        
        clearInterval(this.chatPollingInterval);
        clearInterval(this.dmPollingInterval);
        clearInterval(this.notifPollingInterval);
        
        this.chatPollingInterval = null;
        this.dmPollingInterval = null;
        this.notifPollingInterval = null;

        sessionStorage.removeItem('grk_nick');
    },

    on(event, fn) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(fn);
    },

    off(event, fn) {
        if (!this._listeners.has(event)) return;
        const fns = this._listeners.get(event).filter(f => f !== fn);
        this._listeners.set(event, fns);
    },

    emit(event, data) {
        if (this._listeners.has(event)) {
            this._listeners.get(event).forEach(fn => fn(data));
        }
    }
};
