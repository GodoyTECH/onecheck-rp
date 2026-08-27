const fs = require('fs');
let js = fs.readFileSync('netlify/functions/fac-dm.js', 'utf8');

const newPostBlock = `
        // ── POST /:id/mensagens — enviar mensagem ─────────────
        if (event.httpMethod === 'POST' && matchMsgs) {
            const convId = matchMsgs[1];
            const conv   = await sql\`
                SELECT id, membro1_id, membro2_id FROM conversas
                WHERE id = \${convId} AND (membro1_id = \${payload.id} OR membro2_id = \${payload.id})
                LIMIT 1\`;
            if (!conv.length) return erro('Conversa não encontrada', 404);

            const { conteudo, tipo = 'texto' } = JSON.parse(event.body || '{}');
            if (!conteudo?.trim() && tipo === 'texto') return erro('Vazia');

            const outro_id = conv[0].membro1_id === payload.id ? conv[0].membro2_id : conv[0].membro1_id;

            let extractedMentions = [];
            const textToParse = conteudo.trim();
            const mentionMatches = textToParse.match(/@([A-Za-z0-9_]+)/g) || [];

            if (mentionMatches.length > 0) {
                const nicks = mentionMatches.map(m => m.substring(1).toLowerCase());
                const uniqueNicks = [...new Set(nicks)];
                
                const users = await sql\`SELECT id, nick FROM membros WHERE LOWER(nick) = ANY(\${uniqueNicks})\`;
                extractedMentions = users.map(u => ({ userId: u.id, username: u.nick }));
                
                for (const u of extractedMentions) {
                    if (u.userId !== payload.id) {
                        await sql\`
                            INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo)
                            VALUES (\${u.userId}, 'Você foi mencionado (DM)', \${payload.nick} + ' mencionou você em uma DM.', 'geral')
                        \`;
                    }
                }
            }

            const rows = await sql\`
                INSERT INTO mensagens_dm (conversa_id, remetente_id, tipo, conteudo, mentions)
                VALUES (\${convId}, \${payload.id}, \${tipo}, \${textToParse}, \${JSON.stringify(extractedMentions)}::jsonb)
                RETURNING *\`;

            await sql\`
                UPDATE conversas
                SET ultima_msg = \${tipo === 'texto' ? textToParse.slice(0,50) : '[Mídia]'},
                    ultima_msg_ts = NOW()
                WHERE id = \${convId}\`;

            // Enviar notificação simples (se não foi mencionado no texto, envia a de msg nova normal)
            // if you want normal notifications...

            return ok(rows[0], 201);
        }
`;

js = js.replace(/\/\/ ── POST \/:id\/mensagens — enviar mensagem ─────────────[\s\S]*?return ok\(rows\[0\], 201\);\s*\}/, newPostBlock.trim());

fs.writeFileSync('netlify/functions/fac-dm.js', js, 'utf8');
console.log('Done dm');
