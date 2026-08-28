const fs = require('fs');

let js = fs.readFileSync('js/platform.js', 'utf8');

const newMissoesLogic = `let todosEventosTarefas = [];
let pendingIAParsed = null;

async function carregarMissoes() {
    const tabT = document.getElementById('tabTarefas');
    const tabE = document.getElementById('tabEventos');
    if (tabT) tabT.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);
    if (tabE) tabE.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);

    try {
        todosEventosTarefas = await API.getEventos() || [];
        
        const tarefas = todosEventosTarefas.filter(e => e.tipo === 'tarefa');
        const eventos = todosEventosTarefas.filter(e => e.tipo === 'evento');

        if (tabT) {
            if (tarefas.length === 0) {
                tabT.innerHTML = '<div class="empty-state"><i class="ri-sword-line"></i><p>Nenhuma tarefa cadastrada</p></div>';
            } else {
                tabT.innerHTML = tarefas.map(t => \`
                    <div class="card">
                        <div class="card-title">\${escapeHtml(t.titulo)}</div>
                        <div style="font-size: 0.85rem; color: var(--text-2); margin-top: 5px;">
                            Meta Diária: \${t.meta_diaria > 0 ? t.meta_diaria : 'N/A'}<br>
                            Meta Mensal: \${t.meta_mensal > 0 ? t.meta_mensal : 'N/A'}
                        </div>
                        \${STATE.user.is_admin ? \`<button class="btn btn-ghost" style="margin-top:10px;" onclick="excluirEvTar('\${t.id}')">Excluir</button>\` : ''}
                    </div>
                \`).join('');
            }
        }

        if (tabE) {
            if (eventos.length === 0) {
                tabE.innerHTML = '<div class="empty-state"><i class="ri-calendar-event-line"></i><p>Nenhum evento agendado</p></div>';
            } else {
                tabE.innerHTML = eventos.map(e => \`
                    <div class="card">
                        <div class="card-title">\${escapeHtml(e.titulo)} <span style="font-size:0.75rem; background: var(--red); padding: 2px 6px; border-radius: 4px;">\${e.horarios.length} horários</span></div>
                        <div style="margin-top: 10px; display: grid; gap: 8px;">
                            \${e.horarios.map(h => \`
                                <div style="display: flex; gap: 10px; align-items: center; background: var(--bg-card2); padding: 6px 10px; border-radius: 6px;">
                                    <span style="color: var(--gold); font-weight: bold; font-family: var(--ff-title); letter-spacing: 1px;">\${h.horario}</span>
                                    <span style="font-size: 0.85rem;">\${escapeHtml(h.descricao)}</span>
                                </div>
                            \`).join('')}
                        </div>
                        \${STATE.user.is_admin ? \`<button class="btn btn-ghost" style="margin-top:10px;" onclick="excluirEvTar('\${e.id}')">Excluir Grupo</button>\` : ''}
                    </div>
                \`).join('');
            }
        }

    } catch (e) {
        if (tabT) tabT.innerHTML = '<div class="form-error">Erro ao carregar</div>';
        if (tabE) tabE.innerHTML = '';
        console.error(e);
    }
}

window.excluirEvTar = async (id) => {
    if(!confirm('Certeza que deseja excluir?')) return;
    try {
        await API.excluirEvento(id);
        GRK.toast('Excluído com sucesso');
        carregarMissoes();
    } catch(e) {
        GRK.toast(e.message, 'error');
    }
}
`;

const start = js.indexOf('async function carregarMissoes() {');
const end = js.indexOf('async function carregarConquistas() {');
js = js.substring(0, start) + newMissoesLogic + '\n' + js.substring(end);


const newListeners = `
    // MISSIONS TABS
    document.querySelectorAll('.missions-tabs .tab-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const t = e.target.dataset.missionsTab;
            document.querySelectorAll('.missions-tabs .tab-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('tabTarefas')?.classList.toggle('hidden', t !== 'tarefas');
            document.getElementById('tabEventos')?.classList.toggle('hidden', t !== 'eventos');
        });
    });

    // ADD TAREFA
    document.getElementById('btnSalvarTarefa')?.addEventListener('click', async () => {
        const titulo = document.getElementById('addTarefaTitulo').value.trim();
        const mD = parseInt(document.getElementById('addTarefaMetaDiaria').value || 0);
        const mM = parseInt(document.getElementById('addTarefaMetaMensal').value || 0);
        if(!titulo) return GRK.toast('Título obrigatório', 'error');
        
        try {
            await API.criarEvento({ titulo, tipo: 'tarefa', meta_diaria: mD, meta_mensal: mM });
            document.getElementById('modalAddTarefa').classList.remove('visible');
            document.getElementById('addTarefaTitulo').value = '';
            GRK.toast('Tarefa criada!');
            carregarMissoes();
        } catch(e) {
            GRK.toast(e.message, 'error');
        }
    });

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // ANALISAR EVENTO (IA)
    document.getElementById('btnAnalisarEvento')?.addEventListener('click', async () => {
        const txt = document.getElementById('addEventoTexto').value.trim();
        const fileInput = document.getElementById('addEventoImg');
        const file = fileInput.files?.[0];
        
        if(!txt && !file) return GRK.toast('Insira texto ou imagem', 'error');
        
        const btn = document.getElementById('btnAnalisarEvento');
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Analisando IA...';
        btn.disabled = true;

        try {
            let b64 = null;
            let mime = null;
            if(file) {
                b64 = await fileToBase64(file);
                mime = file.type;
            }
            
            const resultado = await API.parseEventosIA(txt, b64, mime);
            pendingIAParsed = resultado;
            
            document.getElementById('modalAddEvento').classList.remove('visible');
            document.getElementById('modalConfirmarEvento').classList.add('visible');
            document.getElementById('confirmEventoTitulo').value = resultado.titulo || 'Novo Evento';
            
            const prev = document.getElementById('previewHorarios');
            prev.innerHTML = (resultado.horarios || []).map(h => \`<b>\${h.hora}</b> - \${escapeHtml(h.descricao)}\`).join('<br>');

        } catch(e) {
            GRK.toast(e.message, 'error');
        } finally {
            btn.innerHTML = '<i class="ri-magic-line"></i> Extrair Horários';
            btn.disabled = false;
        }
    });

    // CONFIRMAR EVENTO
    document.getElementById('btnSalvarEventoConfirmado')?.addEventListener('click', async () => {
        if(!pendingIAParsed) return;
        const titulo = document.getElementById('confirmEventoTitulo').value.trim();
        if(!titulo) return GRK.toast('Título obrigatório', 'error');
        
        try {
            await API.criarEvento({
                titulo: titulo,
                tipo: 'evento',
                horarios: pendingIAParsed.horarios || []
            });
            document.getElementById('modalConfirmarEvento').classList.remove('visible');
            GRK.toast('Evento agendado!', 'success');
            pendingIAParsed = null;
            carregarMissoes();
        } catch(e) {
            GRK.toast(e.message, 'error');
        }
    });
`;

// Remove the old // MISSIONS TABS block
js = js.replace(/\/\/ MISSIONS TABS[\s\S]*?tab !== 'concluidas'\);\s*}\);\s*}\);/, '');

// Find where to insert newListeners (at the end of inicializarEventListeners)
const insertIndex = js.indexOf('    // Modais: fechar clicando fora');
if (insertIndex !== -1) {
    js = js.substring(0, insertIndex) + newListeners + '\n' + js.substring(insertIndex);
}

fs.writeFileSync('js/platform.js', js, 'utf8');
console.log('Update success');
