/**
 * OneCheck RP — Motor de IA Local + Gemini API
 * Análise semântica de infrações com scoring avançado e IA como fallback
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

// ── Scoring avançado ──────────────────────────────────────────
function scoreRegra(regra, textoNorm) {
    let score = 0;
    
    // 1. Match exato do código (+100)
    if (textoNorm.includes(normalizeSearch(regra.codigo))) {
        score += 100;
    }

    // 2. Match no nome (+80)
    const nomeNorm = normalizeSearch(regra.nome);
    if (nomeNorm && textoNorm.includes(nomeNorm)) {
        score += 80;
    }

    // 3. Match em palavras-chave (+30) e expressões (+60)
    const keywords = regra.keywords || [];
    for (const kw of keywords) {
        const kwNorm = normalizeSearch(kw);
        if (!kwNorm) continue;
        
        // Se a keyword tiver mais de 2 palavras, consideramos "expressão específica" (+60)
        // Se tiver 1 ou 2 palavras, consideramos "palavra-chave" (+30)
        const numPalavras = kwNorm.split(' ').length;
        if (textoNorm.includes(kwNorm)) {
            score += numPalavras > 2 ? 60 : 30;
        }
    }

    // 4. Match em sinônimos (+20)
    const sinonimos = regra.sinonimos || [];
    for (const syn of sinonimos) {
        const synNorm = normalizeSearch(syn);
        if (synNorm && textoNorm.includes(synNorm)) {
            score += 20;
        }
    }
    
    // 5. Match em categoria (+10)
    const catNorm = normalizeSearch(regra.categoria || '');
    if (catNorm && textoNorm.includes(catNorm)) {
        score += 10;
    }

    return score;
}

// ── Análise local (inteligente) ───────────────────────────────
function analisarLocal(texto) {
    if (!texto || !window.REGRAS_RP) return [];

    const textoNorm = normalizeSearch(texto);
    const resultados = [];

    for (const regra of window.REGRAS_RP) {
        const score = scoreRegra(regra, textoNorm);
        if (score > 0) {
            // Calcula uma "confiança" baseada no score máximo prático (~150)
            let confianca = Math.min(99, Math.round((score / 150) * 100));
            // Dá um boost se tiver match direto no código/nome
            if (score >= 80) confianca = Math.max(confianca, 85);
            if (score >= 100) confianca = 99;
            
            resultados.push({ regra, score, confianca });
        }
    }

    // Ordena por score decrescente
    resultados.sort((a, b) => b.score - a.score);

    return resultados;
}

// ── Análise via IA (fallback) ──────────────────────────────────
async function analisarComIA(texto, candidatos) {
    try {
        const response = await fetch('/.netlify/functions/verificar-ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relato: texto, candidatos })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error('Erro na verificação IA:', err);
        return null;
    }
}

// ── Verificação completa ──────────────────────────────────────
async function verificarInfracao(texto, onLocalResult, onIAResult, onError) {
    if (!texto || texto.trim().length < 10) {
        if (onError) onError('Descreva o acontecido com mais detalhes (mínimo 10 caracteres).');
        return;
    }

    // 1. Busca Manual Inteligente
    const localResults = analisarLocal(texto);
    
    // Limiar de confiança para NÃO chamar a IA (ex: 75%)
    const LIMIT_CONFIANCA = 75;
    const melhorResultado = localResults.length > 0 ? localResults[0] : null;

    if (melhorResultado && melhorResultado.confianca >= LIMIT_CONFIANCA) {
        // Confiança alta o suficiente -> Retorna apenas o resultado local e termina.
        if (onLocalResult) onLocalResult(localResults, true /* isFinal */);
        return;
    }

    // 2. IA como Fallback
    // Mostra resultados locais preliminares enquanto a IA pensa
    if (onLocalResult) onLocalResult(localResults, false /* isFinal */);

    // Passa apenas regras candidatas (códigos e nomes) para a IA escolher, evitando invenções
    const candidatosIA = window.REGRAS_RP.map(r => ({
        codigo: r.codigo,
        nome: r.nome,
        descricao: r.descricao
    }));

    const iaResult = await analisarComIA(texto, candidatosIA);
    
    // Merge dos resultados
    if (onIAResult) {
        let finalResults = localResults;
        
        // Se a IA encontrou algo, a gente impulsiona a regra escolhida por ela
        if (iaResult && iaResult.regras_encontradas) {
            const codigosIA = iaResult.regras_encontradas.map(r => r.codigo);
            const recomendacoesIA = window.REGRAS_RP.filter(r => codigosIA.includes(r.codigo));
            
            recomendacoesIA.forEach(r => {
                const existente = finalResults.find(x => x.regra.codigo === r.codigo);
                if (existente) {
                    existente.confianca = Math.max(existente.confianca, iaResult.confianca_geral || 80);
                } else {
                    finalResults.push({ regra: r, score: 50, confianca: iaResult.confianca_geral || 80 });
                }
            });
            
            finalResults.sort((a, b) => b.confianca - a.confianca);
        }
        
        onIAResult(finalResults, iaResult);
    }
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
