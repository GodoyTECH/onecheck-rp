const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the viewMissoes HTML completely
const newMissoesHtml = `
            <div id="viewMissoes" class="view hidden">
                <div class="tab-bar missions-tabs">
                    <button class="tab-item active" data-missions-tab="tarefas">TAREFAS (FARM)</button>
                    <button class="tab-item" data-missions-tab="eventos">EVENTOS</button>
                </div>

                <!-- TAREFAS TAB -->
                <div id="tabTarefas" class="missions-list">
                    <div class="skeleton-card"></div>
                </div>

                <!-- EVENTOS TAB -->
                <div id="tabEventos" class="missions-list hidden">
                    <div class="skeleton-card"></div>
                </div>

                <!-- ADMIN ONLY: ADD BUTTONS -->
                <div class="admin-only hidden" id="adminEventosPanel" style="margin-top: 2rem;">
                    <div class="section-header">
                        <div class="section-title">GERENCIAR</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary flex-1" onclick="document.getElementById('modalAddTarefa').classList.add('visible')">
                            + TAREFA
                        </button>
                        <button class="btn btn-primary flex-1" onclick="document.getElementById('modalAddEvento').classList.add('visible')">
                            + EVENTO (IA)
                        </button>
                    </div>
                </div>
            </div>
`;

// Find <div id="viewMissoes" class="view hidden"> and replace until <div id="viewConquistas" class="view hidden">
const startIdx = html.indexOf('<div id="viewMissoes"');
const endIdx = html.indexOf('<div id="viewConquistas"');
if (startIdx !== -1 && endIdx !== -1) {
    html = html.substring(0, startIdx) + newMissoesHtml + '\n            <!-- \n' + html.substring(endIdx);
}

// Add the modals for Add Tarefa and Add Evento right before <!-- ==========================================
//          MODALS
//     =========================================== -->
const addModals = `
    <!-- MODAL ADD TAREFA -->
    <div id="modalAddTarefa" class="modal-overlay">
        <div class="modal-card">
            <h2 class="modal-title">Nova Tarefa (Farm)</h2>
            <div class="input-field-wrap mb-1">
                <i class="ri-sword-line"></i>
                <input type="text" id="addTarefaTitulo" class="input-field" placeholder="Ex: Farm de Maconha">
            </div>
            <div class="input-field-wrap mb-1">
                <i class="ri-funds-line"></i>
                <input type="number" id="addTarefaMetaDiaria" class="input-field" placeholder="Meta Diária (Opcional)">
            </div>
            <div class="input-field-wrap mb-1">
                <i class="ri-line-chart-line"></i>
                <input type="number" id="addTarefaMetaMensal" class="input-field" placeholder="Meta Mensal (Opcional)">
            </div>
            <div class="modal-actions">
                <button class="btn btn-ghost" onclick="document.getElementById('modalAddTarefa').classList.remove('visible')">Cancelar</button>
                <button class="btn btn-primary" id="btnSalvarTarefa">Salvar</button>
            </div>
        </div>
    </div>

    <!-- MODAL ADD EVENTO -->
    <div id="modalAddEvento" class="modal-overlay">
        <div class="modal-card">
            <h2 class="modal-title">Novo Evento (Análise IA)</h2>
            <p style="font-size: 0.85rem; color: var(--text-2); margin-bottom: 1rem; text-align: center;">Cole uma foto ou texto com os horários para a IA extrair tudo automaticamente.</p>
            
            <textarea id="addEventoTexto" class="textarea-field mb-1" placeholder="Cole o texto aqui..." rows="4"></textarea>
            
            <div class="login-divider">OU IMAGEM</div>
            
            <input type="file" id="addEventoImg" accept="image/*" class="input-field mb-1" style="padding-top: 10px;">
            
            <div class="modal-actions mt-1">
                <button class="btn btn-ghost" onclick="document.getElementById('modalAddEvento').classList.remove('visible')">Cancelar</button>
                <button class="btn btn-primary" id="btnAnalisarEvento"><i class="ri-magic-line"></i> Extrair Horários</button>
            </div>
        </div>
    </div>

    <!-- MODAL CONFIRMAR EVENTO -->
    <div id="modalConfirmarEvento" class="modal-overlay">
        <div class="modal-card" style="max-height: 90vh; overflow-y: auto;">
            <h2 class="modal-title">Confirmar Horários</h2>
            <div class="input-field-wrap mb-1">
                <i class="ri-sword-line"></i>
                <input type="text" id="confirmEventoTitulo" class="input-field" placeholder="Nome do Grupo de Eventos">
            </div>
            <div id="previewHorarios" style="background: var(--bg-card); padding: 10px; border-radius: var(--r-md); margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-2); white-space: pre-wrap;"></div>
            <div class="modal-actions">
                <button class="btn btn-ghost" onclick="document.getElementById('modalConfirmarEvento').classList.remove('visible')">Voltar</button>
                <button class="btn btn-primary" id="btnSalvarEventoConfirmado">Salvar Evento</button>
            </div>
        </div>
    </div>
`;

html = html.replace('<!-- ==========================================\n         MODALS\n    =========================================== -->', '<!-- ==========================================\n         MODALS\n    =========================================== -->\n' + addModals);

fs.writeFileSync('index.html', html, 'utf8');
console.log('HTML updated');
