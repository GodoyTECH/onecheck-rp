/**
 * GoddoY RK — fac-cron-push.js
 * Roda a cada 5 minutos via Netlify Scheduled Functions.
 * Checa na tabela eventos_horarios quais eventos vão acontecer
 * em ~10 minutos e dispara Web Push Notifications.
 */
const { getDb } = require('./utils/db');
const webpush = require('web-push');

exports.handler = async function (event, context) {
    // Apenas responde a invocação do Cron
    console.log('[CRON] Iniciando verificação de eventos...');

    // Configurar chaves do Web Push
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.error('[CRON] Chaves VAPID não configuradas.');
        return { statusCode: 500 };
    }
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@godoyrk.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    const sql = getDb();
    
    try {
        // Hora atual em Brasília
        const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const currentH = nowBRT.getHours();
        const currentM = nowBRT.getMinutes();

        console.log(`[CRON] Hora atual BRT: ${currentH}:${currentM}`);

        // Queremos eventos que ocorram no intervalo [agora + 5, agora + 12] minutos 
        // para garantir que pegamos exatamente os eventos de 10 min antes
        // A margem de 12 minutos é pq o cron pode atrasar uns segundos
        const minAhead = new Date(nowBRT.getTime() + 5 * 60000);
        const maxAhead = new Date(nowBRT.getTime() + 12 * 60000);
        
        const minTimeStr = `${String(minAhead.getHours()).padStart(2, '0')}:${String(minAhead.getMinutes()).padStart(2, '0')}:00`;
        const maxTimeStr = `${String(maxAhead.getHours()).padStart(2, '0')}:${String(maxAhead.getMinutes()).padStart(2, '0')}:00`;

        console.log(`[CRON] Buscando horários entre ${minTimeStr} e ${maxTimeStr}`);

        // Busca horários que batem com esse range, e que não foram notificados hoje
        const todayStr = `${nowBRT.getFullYear()}-${String(nowBRT.getMonth()+1).padStart(2,'0')}-${String(nowBRT.getDate()).padStart(2,'0')}`;
        
        // Cuidado com a virada do dia (ex: minTime = 23:55, maxTime = 00:05)
        let query;
        if (maxAhead.getDate() !== minAhead.getDate()) {
            query = sql`
                SELECT h.id, h.horario, h.descricao, e.titulo, e.tipo 
                FROM eventos_horarios h
                JOIN eventos_tarefas e ON e.id = h.evento_id
                WHERE (h.horario >= ${minTimeStr} OR h.horario <= ${maxTimeStr})
                  AND (h.notificado_hoje IS NULL OR h.notificado_hoje != ${todayStr}::date)
            `;
        } else {
            query = sql`
                SELECT h.id, h.horario, h.descricao, e.titulo, e.tipo 
                FROM eventos_horarios h
                JOIN eventos_tarefas e ON e.id = h.evento_id
                WHERE h.horario >= ${minTimeStr} AND h.horario <= ${maxTimeStr}
                  AND (h.notificado_hoje IS NULL OR h.notificado_hoje != ${todayStr}::date)
            `;
        }

        const eventsToNotify = await query;
        if (eventsToNotify.length === 0) {
            console.log('[CRON] Nenhum evento para notificar agora.');
            return { statusCode: 200, body: 'Sem eventos' };
        }

        console.log(`[CRON] Encontrou ${eventsToNotify.length} horários para notificar.`);

        // Pega as inscrições push de TODOS os membros ativos
        const inscricoes = await sql`
            SELECT m.id, s.endpoint, s.p256dh, s.auth
            FROM push_subscriptions s
            JOIN membros m ON m.id = s.membro_id
            WHERE m.is_ativo = true
        `;

        if (inscricoes.length === 0) {
            console.log('[CRON] Nenhuma inscrição push encontrada.');
        } else {
            // Disparar notificações
            for (const ev of eventsToNotify) {
                const hourFormatted = ev.horario.substring(0, 5); // Ex: '13:20'
                const payloadStr = JSON.stringify({
                    title: `Prepara! ${ev.titulo} em 10 Min!`,
                    body: `${hourFormatted} - ${ev.descricao}`,
                    icon: '/images/logo.jpg',
                    url: '/'
                });

                let sentCount = 0;
                for (const sub of inscricoes) {
                    try {
                        await webpush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth }
                        }, payloadStr);
                        sentCount++;
                    } catch (pushErr) {
                        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                            // Subscrição expirada, remove do DB
                            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
                        }
                    }
                }
                console.log(`[CRON] Push disparado para ${sentCount} dispositivos referente ao evento ${ev.id}`);
                
                // Marcar como notificado hoje
                await sql`UPDATE eventos_horarios SET notificado_hoje = ${todayStr}::date WHERE id = ${ev.id}`;
            }
        }

        return { statusCode: 200, body: 'Notificações processadas' };
    } catch (err) {
        console.error('[CRON] Erro interno:', err);
        return { statusCode: 500, body: err.message };
    }
};

// Configura o agendamento para a Netlify (Formato CRON: A cada 5 minutos)
const { schedule } = require('@netlify/functions');
exports.handler = schedule('*/5 * * * *', exports.handler);
