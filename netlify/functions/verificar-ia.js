/**
 * OneCheck RP — Netlify Function: verificar-ia
 * Integração com Gemini API — seguro no backend
 * Credencial via variável de ambiente GEMINI_API_KEY
 */

exports.handler = async function(event) {
    // Apenas POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método não permitido' })
        };
    }

    // Parse do body
    let relato = '';
    try {
        const body = JSON.parse(event.body || '{}');
        relato = (body.relato || '').trim();
    } catch {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Body inválido' })
        };
    }

    if (!relato || relato.length < 10) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Relato muito curto' })
        };
    }

    // Chave da API via env
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return {
            statusCode: 503,
            body: JSON.stringify({ error: 'Serviço de IA não configurado' })
        };
    }

    // Lista de regras para o prompt
    const regrasTexto = `
RP-01 — RDM (Random Deathmatch): Matar/atacar sem motivo de RP
RP-02 — VDM (Vehicle Deathmatch): Usar veículo como arma sem motivo
RP-03 — Metagaming (MG): Usar informações de fora do jogo
RP-04 — Powergaming (PG): Forçar ações irreais/impossíveis
RP-05 — NLR (New Life Rule): Lembrar/agir sobre morte anterior
RP-06 — Combat Logging: Deslogar durante ação ativa
RP-07 — Anti-RP / Quebra de Imersão: Quebrar imersão propositalmente
RP-08 — Fear RP: Não demonstrar medo em situação de risco
RP-09 — Fail RP: Agir de forma não realista/incoerente
RP-10 — Safe Zone: Cometer crime em zona segura
RP-11 — Godmode: Ignorar ferimentos/danos
RP-12 — Bunny Hop / Abuse de Movimento: Spam de movimentos mecânicos
RP-13 — Bug Abuse / Exploit: Explorar bugs do jogo intencionalmente
RP-14 — Comportamento Tóxico / Desrespeito: Ofensas, racismo, assédio
RP-15 — Spam / Flood: Spam de mensagens ou ações
ALERT-7 — Decisão Gerencial: Caso complexo que exige julgamento do gerente/admin`;

    const systemPrompt = `Você é um árbitro especialista em regras de roleplay do servidor One State RP (Brasil).
Analise o relato do usuário e identifique quais regras foram violadas.

REGRAS DISPONÍVEIS:
${regrasTexto}

Retorne EXCLUSIVAMENTE um JSON válido com este formato:
{
  "regras": ["RP-XX", "RP-YY"],
  "alert7": false,
  "analise": "Análise clara e objetiva em português do Brasil (máximo 3 linhas)",
  "penalidade": "Penalidade sugerida com base nas regras identificadas",
  "confianca": 85
}

INSTRUÇÕES:
- "regras": array com os códigos das regras violadas (pode ter várias). Vazio [] se nenhuma.
- "alert7": true se o caso for complexo/ambíguo ou se múltiplas perspectivas forem válidas
- "analise": explicação sucinta e objetiva do que ocorreu e por que as regras se aplicam
- "penalidade": penalidade sugerida (Aviso, Banimento Temporário, Banimento Permanente, etc)
- "confianca": porcentagem de confiança na análise (0-100)
- Se absolutamente nenhuma regra se aplicar, retorne regras: [] e alert7: true
- Responda APENAS com o JSON, sem texto extra`;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `${systemPrompt}\n\nRELATO DO USUÁRIO:\n"${relato}"` }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 512,
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
            return {
                statusCode: 502,
                body: JSON.stringify({ error: 'Erro na API de IA' })
            };
        }

        const data = await res.json();
        const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse do JSON retornado pelo Gemini
        let parsed;
        try {
            // Remove possíveis ```json ``` wrappers
            const clean = textContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            console.error('Erro ao parsear resposta do Gemini:', textContent);
            return {
                statusCode: 502,
                body: JSON.stringify({ error: 'Resposta inválida da IA' })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(parsed)
        };

    } catch (err) {
        console.error('Erro na Netlify Function:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};
