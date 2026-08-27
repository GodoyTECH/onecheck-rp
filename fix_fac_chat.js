const fs = require('fs');
let js = fs.readFileSync('netlify/functions/fac-chat.js', 'utf8');

// The replacement logic:
const newPostBlock = `
        // ── POST / — enviar mensagem de texto ─────────────────
        if (event.httpMethod === 'POST' && sub === '') {
            const body = JSON.parse(event.body || '{}');
            const { conteudo, tipo = 'texto' } = body;

            if (!conteudo?.trim() && tipo === 'texto') return erro('Mensagem vazia');
            if (conteudo?.length > 500) return erro('Mensagem muito longa (máx 500 caracteres)');

            // Buscar nick/cargo atualizado
            const mem = await sql\`SELECT nick, cargo FROM membros WHERE id = \${payload.id} LIMIT 1\`;
            const { nick, cargo } = mem[0] || { nick: payload.nick, cargo: payload.cargo };

            if (cargo === 'Pendente') return erro('Sua conta ainda não foi aprovada.', 403);

            let extractedMentions = [];
            const textToParse = conteudo.trim();
            const mentionMatches = textToParse.match(/@([A-Za-z0-9_]+)/g) || [];

            if (mentionMatches.length > 0) {
                const nicks = mentionMatches.map(m => m.substring(1).toLowerCase());
                const uniqueNicks = [...new Set(nicks)];
                
                // Fetch real user IDs
                const users = await sql\`SELECT id, nick FROM membros WHERE LOWER(nick) = ANY(\${uniqueNicks})\`;
                
                extractedMentions = users.map(u => ({ userId: u.id, username: u.nick }));
                
                // Insert Notifications
                for (const u of extractedMentions) {
                    if (u.userId !== payload.id) {
                        await sql\`
                            INSERT INTO notificacoes (membro_id, titulo, mensagem, tipo)
                            VALUES (\${u.userId}, 'Você foi mencionado', \${nick} + ' mencionou você no Chat Geral.', 'geral')
                        \`;
                    }
                }
            }

            const rows = await sql\`
                INSERT INTO mensagens_gerais (membro_id, nick, cargo, tipo, conteudo, mentions)
                VALUES (\${payload.id}, \${nick}, \${cargo}, \${tipo}, \${textToParse}, \${JSON.stringify(extractedMentions)}::jsonb)
                RETURNING *\`;

            return ok(rows[0], 201);
        }
`;

js = js.replace(/\/\/ ── POST \/ — enviar mensagem de texto ─────────────────[\s\S]*?return ok\(rows\[0\], 201\);\s*\}/, newPostBlock.trim());

fs.writeFileSync('netlify/functions/fac-chat.js', js, 'utf8');
console.log('Done chat');
