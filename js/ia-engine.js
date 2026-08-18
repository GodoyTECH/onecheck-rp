/**
 * OneCheck RP — Motor de IA Local + Gemini API
 * Análise semântica de infrações com scoring e fallback
 */

// ── Normalização de texto ──────────────────────────────────────
function normalizeText(value) {
    return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeSearch(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ── Scoring local por keywords ─────────────────────────────────
function scoreRegra(regra, textoNorm) {
    let score = 0;
    const keywords = regra.keywords || [];

    for (const kw of keywords) {
        const kwNorm = normalizeSearch(kw);
        if (!kwNorm) continue;
        if (textoNorm.includes(kwNorm)) {
            // Quanto mais específica a keyword, maior o peso
            const peso = kwNorm.split(' ').length > 1 ? 3 : 1;
            score += peso;
        }
    }

    return score;
}

// ── Análise local (rápida, sem API) ───────────────────────────
function analisarLocal(texto) {
    if (!texto || !window.REGRAS_RP) return [];

    const textoNorm = normalizeSearch(texto);
    const resultados = [];

    for (const regra of window.REGRAS_RP) {
        const score = scoreRegra(regra, textoNorm);
        if (score > 0) {
            resultados.push({ regra, score });
        }
    }

    // Ordena por score decrescente
    resultados.sort((a, b) => b.score - a.score);

    return resultados;
}

// ── Análise via Gemini API (backend Netlify Function) ──────────
async function analisarComGemini(texto) {
    try {
        const response = await fetch('/.netlify/functions/verificar-ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relato: texto })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error('Erro na verificação Gemini:', err);
        return null;
    }
}

// ── Verificação completa (local + Gemini) ─────────────────────
async function verificarInfracao(texto, onLocalResult, onGeminiResult, onError) {
    if (!texto || texto.trim().length < 10) {
        if (onError) onError('Descreva o acontecido com mais detalhes (mínimo 10 caracteres).');
        return;
    }

    // 1. Análise local imediata
    const localResults = analisarLocal(texto);
    if (onLocalResult) onLocalResult(localResults);

    // 2. Análise Gemini (assíncrona)
    const geminiResult = await analisarComGemini(texto);
    if (onGeminiResult) onGeminiResult(geminiResult, localResults);
}

// ── Determina severidade ───────────────────────────────────────
function getSeveridadeLabel(sev) {
    const map = {
        'alta': { label: 'GRAVE', color: '#ef4444', icon: '🔴' },
        'media': { label: 'MODERADA', color: '#f59e0b', icon: '🟡' },
        'baixa': { label: 'LEVE', color: '#22c55e', icon: '🟢' },
        'gerencial': { label: 'ALERT 7', color: '#a855f7', icon: '⚠️' }
    };
    return map[sev] || map['baixa'];
}

// Exporta para uso global
window.verificarInfracao = verificarInfracao;
window.analisarLocal = analisarLocal;
window.getSeveridadeLabel = getSeveridadeLabel;
