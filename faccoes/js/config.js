/**
 * OneCheck RP — Sistema de Facções
 * Configuração — SEGURA
 *
 * As credenciais do Supabase ficam APENAS no Netlify (variáveis de ambiente).
 * O frontend busca a configuração via Netlify Function.
 * NENHUMA chave é exposta no código-fonte.
 *
 * No painel do Netlify → Site Settings → Environment Variables, declare:
 *   SUPABASE_URL      = https://seu-projeto.supabase.co
 *   SUPABASE_ANON_KEY = sua-anon-key-aqui
 */

const CONFIG = {
    APP_NAME:        'OneCheck RP — Facções',
    VERSION:         '1.1.0',
    MAX_MSG_LENGTH:  500,
    MAX_AUDIO_SEC:   60,
    CARGO_RANKS: {
        'Membro':     1,
        'Veterano':   2,
        'Oficial':    3,
        'Vice-Líder': 4,
        'Líder':      5
    },
    CORES_DISPONIVEIS: [
        '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
        '#a855f7', '#ec4899', '#06b6d4', '#f97316',
        '#64748b', '#10b981'
    ],
    ICONES_DISPONIVEIS: [
        '🏴','⚔️','🔫','🚔','🏥','🚗','💰','🦁',
        '🐺','🦅','🐉','💎','🔥','❄️','⚡','🌙',
        '☠️','🎭','🛡️','👑','🎯','🌊','🏆','💀'
    ]
};

// ── Estado ─────────────────────────────────────────────────
let _supabase    = null;
let _modoDemo    = true;   // assume demo até confirmar Supabase
let _configCarregada = false;

/**
 * Inicializa: busca credenciais via Netlify Function (seguro)
 * Cai para modo DEMO se Supabase não estiver configurado
 */
async function initConfig() {
    if (_configCarregada) return;

    try {
        const res = await fetch('/.netlify/functions/fac-config', { cache: 'no-store' });
        if (!res.ok) throw new Error('Function indisponível');

        const data = await res.json();

        if (data.configured && data.url && data.anonKey && window.supabase) {
            _supabase = window.supabase.createClient(data.url, data.anonKey, {
                realtime: { params: { eventsPerSecond: 10 } }
            });
            _modoDemo = false;
            console.log('[Facções] Supabase conectado via Netlify Function ✅');
        } else {
            _modoDemo = true;
            console.warn('[Facções] Modo DEMO ativo. Configure SUPABASE_URL e SUPABASE_ANON_KEY no Netlify.');
        }
    } catch (e) {
        _modoDemo = true;
        console.warn('[Facções] Modo DEMO ativo (function indisponível):', e.message);
    }

    _configCarregada = true;
}

// ── Getters ────────────────────────────────────────────────
function getSupabase()  { return _supabase; }
function isModoDemo()   { return _modoDemo; }

// Exportar
window.FACCAO_CONFIG = CONFIG;

// Compatibilidade com código anterior
Object.defineProperty(window, 'FACCAO_DEMO', { get: () => _modoDemo });
Object.defineProperty(window, 'getSupabase', { value: getSupabase, writable: true });

window.initFaccaoConfig = initConfig;
window.isModoDemo       = isModoDemo;
