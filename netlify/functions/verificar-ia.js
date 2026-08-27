/**
 * OneCheck RP — Netlify Function: verificar-ia
 * Integração com Gemini API — credenciais via variável de ambiente GEMINI_API_KEY
 * Regras completas do One State RP (todas as categorias, sem infrações policiais internas)
 */

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
    }

    let relato = '';
    try {
        const body = JSON.parse(event.body || '{}');
        relato = (body.relato || '').trim();
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) };
    }

    if (!relato || relato.length < 10) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Relato muito curto' }) };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return { statusCode: 503, body: JSON.stringify({ error: 'Serviço de IA não configurado' }) };
    }

    // ── Lista completa de regras para o prompt ─────────────────────────
    let regrasTexto = '';
    
    // Se o frontend enviou os candidatos
    if (body.candidatos && Array.isArray(body.candidatos) && body.candidatos.length > 0) {
        regrasTexto = '=== REGRAS DISPONÍVEIS ===\n';
        body.candidatos.forEach(c => {
            regrasTexto += `${c.codigo} - ${c.nome}: ${c.descricao}\n`;
        });
        regrasTexto += `ALERT-7 - Decisão Gerencial: Caso complexo, ambíguo ou sem precedente. Requer gerente/admin.\n`;
    } else {
        // Fallback: usar a lista embutida se os candidatos não vierem
        regrasTexto = `
=== REGRAS DE ROLEPLAY (RP) ===
RP-01  - DM (Deathmatch): Causar dano/matar sem motivo de RP válido. Penalidade: 20min prisão.
RP-02  - DMAuto (VDM): Usar veículo como arma sem motivo de RP. Penalidade: 20min prisão.
RP-03  - Power Gaming: Ações impossíveis/irreais, forçar situações sem consenso. Penalidade: 15min prisão.
RP-04  - NRP (Non RolePlay): Comportamento que quebra a lógica do RP. Penalidade: 15min prisão.
RP-05  - Metagaming: Usar informações OOC (Discord, lives) dentro do RP. Penalidade: 30-60min prisão ou mute.
RP-06  - Abandono de RP / Combat Log: Deslogar ou fugir para safe durante ação ativa. Penalidade: 30-60min prisão.
RP-07  - Fear RP: Não demonstrar medo com arma apontada / desvantagem clara. Penalidade: Advertência/20min.
RP-08  - Fail RP: Roleplay completamente incoerente com o personagem. Penalidade: Advertência/15min.
RP-09  - NLR (New Life Rule): Agir com base em memórias anteriores à morte do personagem. Penalidade: Advertência/20min.
RP-10  - Safe Zone Abuse: Crime em zona segura ou fuga para safe para evitar RP. Penalidade: Advertência/20min.
RP-11  - Godmode: Ignorar danos/ferimentos de forma impossível. Penalidade: Advertência/20min/ban temp.
RP-12  - Bunny Hop: Spam de saltos/roladas para fugir ou obter vantagem. Penalidade: Advertência/15min.
RP-13  - Bug Abuse / Exploit: Usar bugs/glitches intencionalmente. Penalidade: Ban temporário/permanente.
RP-14  - Anti-RP: Quebrar imersão propositalmente, piadas em situações sérias. Penalidade: Advertência/15min.
RP-15  - Abuso de /me /do /try: Usar comandos de RP desonestamente para vantagem. Penalidade: Advertência/15min.

=== CONDUTA GERAL ===
COND-01 - Toxicidade/Discriminação: Ofensas, racismo, homofobia, assédio. Penalidade: Ban temp/permanente.
COND-02 - Spam/Flood: Mensagens ou ações repetitivas abusivas. Penalidade: Kick/Mute/Ban temp.
COND-03 - OOC no IC: Falar fora do personagem sem usar /n. Penalidade: Aviso/Advertência.
COND-04 - Assédio/Perseguição: Ataques sistemáticos a jogador específico por motivos pessoais. Penalidade: Ban.

=== REGRAS DE CONTA ===
CONTA-01 - RMT (Real Money Trade): Vender/comprar itens/dinheiro do jogo por dinheiro real. Penalidade: Ban permanente.
CONTA-02 - Venda/Compartilhamento de Conta: Transferir ou emprestar conta. Penalidade: Ban permanente.
CONTA-03 - Multi-Conta / Ban Evade: Mais de 3 contas ou nova conta para escapar de ban. Penalidade: Ban permanente todas.
CONTA-04 - Hack/Cheat/Mod Ilegal: Qualquer software de trapaça. Penalidade: Ban permanente imediato.

=== COMUNICAÇÃO ===
COM-01 - Abuso de Comandos RP: /me /do /try para ações impossíveis ou desonesto. Penalidade: Advertência/15min.
COM-02 - Informação OOC Revelada: Compartilhar localização/identidade fora do jogo. Penalidade: Advertência/ban temp.
COM-03 - Incitação Sistemática: Provocar jogadores para gerar reações negativas. Penalidade: Advertência/ban temp.

=== DECISÃO ESPECIAL ===
ALERT-7 - Decisão Gerencial: Caso complexo, ambíguo, sem precedente ou com regras conflitantes. Requer gerente/admin.`;
    }

    const systemPrompt = `Você é um árbitro especialista nas regras do servidor de roleplay One State RP (Brasil).
Analise o relato do jogador e identifique a regra mais provável que foi violada.

REGRAS DISPONÍVEIS:
${regrasTexto}

INSTRUÇÕES IMPORTANTES:
1. Identifique as violações baseando-se apenas nas regras listadas. NÃO invente regras.
2. Retorne os códigos exatos.
3. Se o caso for ambíguo, complexo ou envolver múltiplas perspectivas válidas, inclua ALERT-7
4. Se absolutamente nenhuma regra se aplicar claramente, retorne regras_encontradas:[] e alert7:true
5. A penalidade sugerida deve ser a MAIS GRAVE das regras violadas
6. Seja objetivo e direto na análise
7. Responda APENAS com o JSON abaixo, sem texto extra

Retorne EXCLUSIVAMENTE este JSON válido:
{
  "regras_encontradas": [{"codigo": "RP-01"}],
  "alert7": false,
  "analise": "Análise clara em português (máximo 3 linhas)",
  "penalidade": "Penalidade sugerida mais grave",
  "confianca_geral": 85
}`;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [{
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nRELATO DO JOGADOR:\n"${relato}"` }]
            }],
            generationConfig: {
                temperature: 0.15,
                maxOutputTokens: 600,
                responseMimeType: 'application/json'
            }
        };

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('Gemini API error:', errData);
            return { statusCode: 502, body: JSON.stringify({ error: 'Erro na API de IA' }) };
        }

        const data = await res.json();
        const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        let parsed;
        try {
            const clean = textContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            console.error('Erro ao parsear resposta do Gemini:', textContent);
            return { statusCode: 502, body: JSON.stringify({ error: 'Resposta inválida da IA' }) };
        }

        // Validar e sanitizar
        if (!parsed.regras_encontradas || !Array.isArray(parsed.regras_encontradas)) parsed.regras_encontradas = [];
        if (typeof parsed.alert7 !== 'boolean') parsed.alert7 = false;
        if (!parsed.analise) parsed.analise = '';
        if (!parsed.penalidade) parsed.penalidade = '';
        if (typeof parsed.confianca_geral !== 'number') parsed.confianca_geral = 0;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(parsed)
        };

    } catch (err) {
        console.error('Erro na Netlify Function:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Erro interno do servidor' }) };
    }
};
