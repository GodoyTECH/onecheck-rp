/**
 * OneCheck RP — Sistema de Facções
 * Configuração do Supabase
 *
 * INSTRUÇÕES:
 * 1. Acesse https://supabase.com e crie uma conta gratuita
 * 2. Crie um novo projeto
 * 3. Vá em Settings → API e copie:
 *    - Project URL → SUPABASE_URL abaixo
 *    - anon public key → SUPABASE_ANON_KEY abaixo
 * 4. Execute o arquivo sql/schema.sql no SQL Editor do Supabase
 */

const SUPABASE_URL      = 'COLE_SUA_URL_AQUI';         // ex: https://xyzabc.supabase.co
const SUPABASE_ANON_KEY = 'COLE_SUA_ANON_KEY_AQUI';    // chave pública (anon)

// ─── Modo de operação ───────────────────────────────────────
// true  → usa localStorage (modo demo, sem backend)
// false → usa Supabase real
const MODO_DEMO = (SUPABASE_URL === 'COLE_SUA_URL_AQUI');

// ─── Configurações gerais ────────────────────────────────────
const CONFIG = {
    APP_NAME:        'OneCheck RP — Facções',
    VERSION:         '1.0.0',
    MAX_MSG_LENGTH:  500,
    MAX_AUDIO_SEC:   60,
    MAX_FACCOES:     50,
    CARGO_RANKS: {
        'Membro':     1,
        'Veterano':   2,
        'Oficial':    3,
        'Vice-Líder': 4,
        'Líder':      5
    },
    CORES_DISPONIVEIS: [
        '#3b82f6', // azul
        '#ef4444', // vermelho
        '#22c55e', // verde
        '#f59e0b', // amarelo
        '#a855f7', // roxo
        '#ec4899', // rosa
        '#06b6d4', // ciano
        '#f97316', // laranja
        '#64748b', // cinza
        '#10b981', // esmeralda
    ],
    ICONES_DISPONIVEIS: [
        '🏴','⚔️','🔫','🚔','🏥','🚗','💰','🦁',
        '🐺','🦅','🐉','💎','🔥','❄️','⚡','🌙',
        '☠️','🎭','🛡️','👑','🎯','🌊','🏆','💀'
    ]
};

// ─── Inicialização do Supabase ───────────────────────────────
let supabase = null;

function initSupabase() {
    if (MODO_DEMO) {
        console.warn('[FacçãoChat] Modo DEMO ativo — usando localStorage. Configure o Supabase em faccoes/js/config.js');
        return null;
    }
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: { params: { eventsPerSecond: 10 } }
        });
        console.log('[FacçãoChat] Supabase conectado!');
        return supabase;
    } catch (e) {
        console.error('[FacçãoChat] Erro ao conectar Supabase:', e);
        return null;
    }
}

// Exportar
window.FACCAO_CONFIG  = CONFIG;
window.FACCAO_DEMO    = MODO_DEMO;
window.getSupabase    = () => supabase || initSupabase();
