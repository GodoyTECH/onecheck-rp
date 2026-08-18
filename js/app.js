/**
 * OneCheck RP — App Principal
 * Lógica de interface, autenticação e renderização
 * Desenvolvido por Godoy Solutions in TECH — Caíque Eduardo
 */

const APP_PASSWORD = '@Devereux16';
const AUTH_KEY = 'onecheck_rp_auth';

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initApp();
});

// ── AUTENTICAÇÃO ───────────────────────────────────────────────
function initAuth() {
    const isAuth = sessionStorage.getItem(AUTH_KEY) === '1';
    const loginView = document.getElementById('loginView');
    const appView  = document.getElementById('appView');

    if (isAuth) {
        if (loginView) loginView.style.display = 'none';
        if (appView)  appView.classList.remove('app-hidden');
    } else {
        if (loginView) loginView.style.display = 'flex';
        if (appView)  appView.classList.add('app-hidden');
    }

    const passwordInput = document.getElementById('passwordInput');
    const loginBtn      = document.getElementById('loginBtn');
    const logoutBtn     = document.getElementById('logoutBtn');
    const loginError    = document.getElementById('loginError');

    function doLogin() {
        const val = passwordInput ? passwordInput.value : '';
        if (val === APP_PASSWORD) {
            sessionStorage.setItem(AUTH_KEY, '1');
            if (loginView) loginView.style.display = 'none';
            if (appView)   appView.classList.remove('app-hidden');
            if (loginError) loginError.style.display = 'none';
            if (passwordInput) passwordInput.value = '';
        } else {
            if (loginError) {
                loginError.style.display = 'block';
                loginError.textContent = '❌ Senha incorreta. Verifique e tente novamente.';
            }
            if (passwordInput) {
                passwordInput.classList.add('shake');
                setTimeout(() => passwordInput.classList.remove('shake'), 500);
            }
        }
    }

    if (loginBtn) loginBtn.addEventListener('click', doLogin);
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doLogin();
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem(AUTH_KEY);
            if (loginView) loginView.style.display = 'flex';
            if (appView)  appView.classList.add('app-hidden');
        });
    }
}

// ── APP PRINCIPAL ──────────────────────────────────────────────
function initApp() {
    const entradaTexto   = document.getElementById('entradaTexto');
    const btnVerificar   = document.getElementById('btnVerificar');
    const btnLimpar      = document.getElementById('btnLimpar');
    const btnVoz         = document.getElementById('btnVoz');
    const charCount      = document.getElementById('charCount');
    const resultadoArea  = document.getElementById('resultadoArea');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const regrasGrid     = document.getElementById('regrasGrid');

    // Renderiza grid de regras na lateral
    if (regrasGrid && window.REGRAS_RP) {
        renderRegrasGrid(regrasGrid);
    }

    // Contador de caracteres
    if (entradaTexto && charCount) {
        entradaTexto.addEventListener('input', () => {
            charCount.textContent = entradaTexto.value.length;
        });
    }

    // Botão limpar
    if (btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            if (entradaTexto) {
                entradaTexto.value = '';
                if (charCount) charCount.textContent = '0';
            }
            limparResultados();
        });
    }

    // Botão verificar
    if (btnVerificar) {
        btnVerificar.addEventListener('click', () => {
            const texto = entradaTexto ? entradaTexto.value.trim() : '';
            executarVerificacao(texto, { entradaTexto, btnVerificar, resultadoArea, loadingOverlay });
        });
    }

    // Voz (Speech Recognition)
    if (btnVoz) {
        initVoz(btnVoz, entradaTexto, charCount);
    }

    // Atalho: Ctrl+Enter para verificar
    if (entradaTexto) {
        entradaTexto.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (btnVerificar) btnVerificar.click();
            }
        });
    }
}

// ── EXECUÇÃO DA VERIFICAÇÃO ────────────────────────────────────
async function executarVerificacao(texto, els) {
    const { entradaTexto, btnVerificar, resultadoArea, loadingOverlay } = els;

    if (!texto || texto.length < 10) {
        mostrarErro('⚠️ Descreva o acontecido com mais detalhes para que a IA possa analisar corretamente.', resultadoArea);
        return;
    }

    // Mostra loading
    setLoading(true, btnVerificar, loadingOverlay);

    try {
        await window.verificarInfracao(
            texto,
            // Callback de resultado local (imediato)
            (localResults) => {
                renderResultadoLocal(localResults, resultadoArea);
            },
            // Callback do Gemini (definitivo)
            (geminiResult, localResults) => {
                setLoading(false, btnVerificar, loadingOverlay);
                renderResultadoFinal(geminiResult, localResults, resultadoArea);
            },
            // Erro
            (errMsg) => {
                setLoading(false, btnVerificar, loadingOverlay);
                mostrarErro(errMsg, resultadoArea);
            }
        );
    } catch (err) {
        setLoading(false, btnVerificar, loadingOverlay);
        console.error(err);
        mostrarErro('Erro inesperado na verificação. Tente novamente.', resultadoArea);
    }
}

// ── RENDERIZAÇÃO DE RESULTADOS ─────────────────────────────────
function renderResultadoLocal(localResults, container) {
    if (!container) return;

    if (localResults.length === 0) {
        container.innerHTML = `
            <div class="result-placeholder scanning">
                <div class="scan-spinner"></div>
                <p>🔍 Analisando o relato com IA Gemini... Aguarde.</p>
            </div>`;
        return;
    }

    const topResult = localResults[0];
    const { regra, score } = topResult;
    const sevInfo = window.getSeveridadeLabel(regra.severidade);

    container.innerHTML = `
        <div class="result-card scanning-complete" style="border-color: ${sevInfo.color}40;">
            <div class="result-scanning-badge">
                <span class="scan-pulse"></span> Análise rápida concluída · Processando com Gemini...
            </div>
            <div class="result-main">
                <div class="result-code" style="color: ${sevInfo.color};">${regra.codigo}</div>
                <div class="result-icon">${regra.icon}</div>
                <h2 class="result-name">${regra.nome}</h2>
                <div class="result-sev-badge" style="background: ${sevInfo.color}20; color: ${sevInfo.color}; border: 1px solid ${sevInfo.color}40;">
                    ${sevInfo.icon} ${sevInfo.label}
                </div>
                <p class="result-desc">${regra.descricao}</p>
            </div>
            ${localResults.length > 1 ? `<div class="result-other">+${localResults.length - 1} possível(is) infração(ões) também detectada(s)</div>` : ''}
        </div>`;
}

function renderResultadoFinal(geminiResult, localResults, container) {
    if (!container) return;

    // Se Gemini retornou resultado válido, usa ele
    if (geminiResult && geminiResult.regras && geminiResult.regras.length > 0) {
        renderGeminiResult(geminiResult, container);
        return;
    }

    // Fallback: usa análise local
    if (localResults && localResults.length > 0) {
        renderLocalResultFinal(localResults, container);
    } else {
        renderAlert7(container);
    }
}

function renderGeminiResult(data, container) {
    const regrasCodigos = data.regras || [];
    const analise = data.analise || '';
    const isAlert7 = data.alert7 === true;
    const penalidade = data.penalidade || '';
    const confianca = data.confianca || 0;

    let regrasHtml = '';
    for (const codigo of regrasCodigos) {
        const regra = (window.REGRAS_RP || []).find(r => r.codigo === codigo);
        if (!regra) continue;
        const sevInfo = window.getSeveridadeLabel(regra.severidade);
        regrasHtml += `
            <div class="regra-chip" style="border-color: ${sevInfo.color}60; background: ${sevInfo.color}10;">
                <span class="regra-chip-icon">${regra.icon}</span>
                <span class="regra-chip-code" style="color: ${sevInfo.color};">${regra.codigo}</span>
                <span class="regra-chip-name">${regra.nome}</span>
            </div>`;
    }

    if (isAlert7) {
        const alert7 = (window.REGRAS_RP || []).find(r => r.codigo === 'ALERT-7');
        if (alert7) {
            regrasHtml += `
                <div class="regra-chip alert7-chip">
                    <span class="regra-chip-icon">⚠️</span>
                    <span class="regra-chip-code" style="color: #a855f7;">ALERT-7</span>
                    <span class="regra-chip-name">Decisão Gerencial</span>
                </div>`;
        }
    }

    container.innerHTML = `
        <div class="result-final-card">
            <div class="result-final-header">
                <div class="gemini-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#60a5fa"/></svg>
                    Verificado por IA Gemini
                </div>
                ${confianca > 0 ? `<div class="confianca-badge">Confiança: ${confianca}%</div>` : ''}
            </div>

            <div class="regras-encontradas">
                <h3>Infrações Identificadas</h3>
                <div class="regras-chips-grid">${regrasHtml || '<span class="no-infraction">Nenhuma infração clara identificada</span>'}</div>
            </div>

            ${analise ? `
            <div class="analise-ia">
                <h3>📋 Análise da IA</h3>
                <p>${analise}</p>
            </div>` : ''}

            ${penalidade ? `
            <div class="penalidade-box">
                <h3>⚖️ Penalidade Sugerida</h3>
                <p>${penalidade}</p>
            </div>` : ''}

            ${isAlert7 ? `
            <div class="alert7-box">
                <div class="alert7-icon">⚠️</div>
                <h3>Alert 7 — Decisão Gerencial Recomendada</h3>
                <p>Este caso possui elementos complexos ou conflitantes que requerem análise direta de um <strong>gerente ou administrador</strong> do servidor. Apresente o relato completo para uma decisão administrativa.</p>
            </div>` : ''}
        </div>`;
}

function renderLocalResultFinal(localResults, container) {
    const topItems = localResults.slice(0, 3);

    let cardsHtml = topItems.map(({ regra, score }, idx) => {
        const sevInfo = window.getSeveridadeLabel(regra.severidade);
        return `
            <div class="regra-result-card ${idx === 0 ? 'primary' : 'secondary'}" style="border-color: ${sevInfo.color}40;">
                <div class="regra-result-top">
                    <span class="regra-result-code" style="color: ${sevInfo.color};">${regra.codigo}</span>
                    <span class="regra-result-sev" style="color: ${sevInfo.color};">${sevInfo.icon} ${sevInfo.label}</span>
                </div>
                <div class="regra-result-icon">${regra.icon}</div>
                <h3 class="regra-result-name">${regra.nome}</h3>
                <p class="regra-result-desc">${regra.descricao}</p>
                <div class="regra-result-penalty">
                    <strong>⚖️ Penalidade:</strong> ${regra.penalidade}
                </div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="result-final-card">
            <div class="result-final-header">
                <div class="local-badge">🔍 Análise por Motor Local</div>
                <small style="color: var(--text-muted);">Gemini indisponível — usando análise de keywords</small>
            </div>
            <div class="regras-cards-grid">${cardsHtml}</div>
        </div>`;
}

function renderAlert7(container) {
    container.innerHTML = `
        <div class="result-final-card alert7-result">
            <div class="alert7-box-large">
                <div class="alert7-glow">⚠️</div>
                <h2>Alert 7 — Decisão Gerencial</h2>
                <p>A situação descrita não se encaixou claramente em nenhuma regra padrão do servidor. Este caso requer <strong>análise direta de um gerente ou administrador</strong> do One State RP.</p>
                <ul>
                    <li>📋 Documente o caso com prints e vídeos</li>
                    <li>🎫 Abra um ticket no Discord do servidor</li>
                    <li>👤 Solicite a presença de um gerente</li>
                    <li>📡 Relate com todos os detalhes e hora do ocorrido</li>
                </ul>
            </div>
        </div>`;
}

// ── GRID DE REGRAS (REFERÊNCIA LATERAL) ───────────────────────
function renderRegrasGrid(container) {
    const regras = window.REGRAS_RP || [];
    container.innerHTML = regras.map(regra => {
        const sevInfo = window.getSeveridadeLabel(regra.severidade);
        return `
            <div class="regra-ref-card ${regra.especial ? 'alert7-ref' : ''}" onclick="preencherExemplo(${JSON.stringify(regra.exemplos[0]).replace(/'/g, "\\'")})" title="Clique para testar um exemplo">
                <div class="regra-ref-header">
                    <span class="regra-ref-icon">${regra.icon}</span>
                    <span class="regra-ref-code" style="color: ${sevInfo.color};">${regra.codigo}</span>
                </div>
                <div class="regra-ref-name">${regra.nome}</div>
                <div class="regra-ref-sev" style="color: ${sevInfo.color};">${sevInfo.icon} ${sevInfo.label}</div>
            </div>`;
    }).join('');
}

window.preencherExemplo = function(exemplo) {
    const entradaTexto = document.getElementById('entradaTexto');
    const charCount    = document.getElementById('charCount');
    if (entradaTexto) {
        entradaTexto.value = exemplo;
        entradaTexto.focus();
        if (charCount) charCount.textContent = exemplo.length;
        entradaTexto.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

// ── UTILITÁRIOS ────────────────────────────────────────────────
function setLoading(active, btnVerificar, loadingOverlay) {
    if (btnVerificar) {
        btnVerificar.disabled = active;
        btnVerificar.innerHTML = active
            ? '<span class="btn-spinner"></span> Analisando...'
            : '<i class="ri-search-eye-line"></i> Verificar com IA';
    }
    if (loadingOverlay) {
        loadingOverlay.classList.toggle('active', active);
    }
}

function limparResultados() {
    const resultadoArea = document.getElementById('resultadoArea');
    if (resultadoArea) {
        resultadoArea.innerHTML = `
            <div class="result-placeholder">
                <div class="placeholder-icon">🛡️</div>
                <p>Descreva o acontecido acima e clique em <strong>Verificar com IA</strong> para identificar as regras aplicáveis.</p>
                <span class="placeholder-hint">Dica: Seja detalhado — mencione o contexto, o que aconteceu e quem estava envolvido.</span>
            </div>`;
    }
}

function mostrarErro(msg, container) {
    if (!container) return;
    container.innerHTML = `
        <div class="result-error">
            <span>⚠️</span>
            <p>${msg}</p>
        </div>`;
}

// ── ENTRADA POR VOZ ────────────────────────────────────────────
function initVoz(btnVoz, entradaTexto, charCount) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        if (btnVoz) btnVoz.style.display = 'none';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;

    btnVoz.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
            return;
        }
        isListening = true;
        btnVoz.classList.add('listening');
        btnVoz.title = 'Clique para parar';
        recognition.start();
    });

    recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (entradaTexto) {
            entradaTexto.value += (entradaTexto.value ? ' ' : '') + transcript;
            if (charCount) charCount.textContent = entradaTexto.value.length;
        }
    };

    recognition.onend = () => {
        isListening = false;
        if (btnVoz) {
            btnVoz.classList.remove('listening');
            btnVoz.title = 'Entrada por voz';
        }
    };

    recognition.onerror = () => {
        isListening = false;
        if (btnVoz) btnVoz.classList.remove('listening');
    };
}
