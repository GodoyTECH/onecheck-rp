/**
 * GoddoY RK — fac-ai-parser.js
 * Extrai horários e locais de um texto bruto ou imagem usando a API do Google Gemini.
 */
const { verificarToken, extrairToken, ok, erro, preflight } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    const payload = verificarToken(extrairToken(event));
    if (!payload || !payload.isAdmin) return erro('Não autorizado', 403);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return erro('A chave de API GEMINI_API_KEY não está configurada no Netlify.', 500);
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { texto, imagemBase64, mimeType } = body;

        if (!texto && !imagemBase64) {
            return erro('Forneça um texto ou uma imagem.');
        }

        const prompt = `Você é um assistente de extração de dados. Extraia os horários e nomes dos eventos (locais) do input fornecido.
O input pode ser referente a "Horários de PVP" ou "Eventos".
Sua saída DEVE ser estritamente em JSON, e nada mais. Não inclua \`\`\`json ou qualquer texto ao redor.
Formato exato requerido:
{
  "titulo": "Nome sugerido para o grupo (Ex: Eventos PVP)",
  "tipo": "evento",
  "horarios": [
    { "hora": "13:20", "descricao": "Veneza Direita" },
    { "hora": "15:40", "descricao": "Costa" }
  ]
}
A hora deve estar sempre no formato 24h, exemplo "17:25". Se o input falar "Após 21h", trate como 21:00 em diante e converta corretamente.
Mantenha a descrição fiel à imagem ou texto fornecido. Não invente dados.`;

        let contents = [];

        if (imagemBase64) {
            // Remove o prefixo data:image/png;base64, se existir
            const b64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
            contents.push({
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType || "image/jpeg",
                            data: b64Data
                        }
                    }
                ]
            });
        } else {
            contents.push({
                role: "user",
                parts: [
                    { text: prompt + "\\n\\nTEXTO A PROCESSAR:\\n" + texto }
                ]
            });
        }

        const gApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const gRes = await fetch(gApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.1, // baixa criatividade para extração precisa
                    response_mime_type: "application/json"
                }
            })
        });

        if (!gRes.ok) {
            const errTxt = await gRes.text();
            console.error('Gemini API Error:', errTxt);
            return erro('Falha na API da IA. Verifique os logs.');
        }

        const gData = await gRes.json();
        const textoRetornado = gData.candidates[0].content.parts[0].text;

        // O response_mime_type garante que já virá como JSON (string)
        const jsonParseado = JSON.parse(textoRetornado.trim());

        return ok(jsonParseado);
    } catch (err) {
        console.error('[FAC-AI-PARSER]', err);
        return erro('Erro interno: ' + err.message, 500);
    }
};
