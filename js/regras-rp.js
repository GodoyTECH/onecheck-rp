/**
 * OneCheck RP — Base de Regras do One State RP
 * Apenas regras de Roleplay (sem seção policial)
 * Desenvolvido por Godoy Solutions in TECH — Caíque Eduardo
 */

const REGRAS_RP = [
    {
        codigo: 'RP-01',
        nome: 'RDM — Random Deathmatch',
        descricao: 'Matar, atacar ou causar dano a outro jogador sem qualquer motivo ou contexto de roleplay.',
        exemplos: [
            'Chegar em alguém e atirar sem qualquer interação anterior',
            'Matar jogador por ele estar no mesmo lugar',
            'Atacar sem aviso ou contexto de RP',
            'Brigar sem motivo no meio da rua'
        ],
        penalidade: 'Aviso formal → Banimento temporário → Banimento permanente',
        severidade: 'alta',
        keywords: ['rdm', 'random', 'deathmatch', 'matar sem motivo', 'atirar sem motivo', 'atacar sem razão', 'matar aleatoriamente', 'kill sem motivo', 'matou sem', 'atirou sem', 'baleou sem motivo', 'tiro sem motivo', 'agrediu sem motivo'],
        icon: '🔫'
    },
    {
        codigo: 'RP-02',
        nome: 'VDM — Vehicle Deathmatch',
        descricao: 'Usar veículo intencionalmente para atropelar, colidir ou matar outro jogador sem motivo de RP.',
        exemplos: [
            'Atropelar pedestre propositalmente e fugir',
            'Usar carro como arma em perseguição sem contexto',
            'Jogar veículo em grupo de pessoas sem RP',
            'Bater de propósito para derrubar moto'
        ],
        penalidade: 'Aviso formal → Banimento temporário → Banimento permanente',
        severidade: 'alta',
        keywords: ['vdm', 'vehicle', 'atropelar', 'atropelou', 'jogar carro', 'carro em cima', 'veículo como arma', 'bater de propósito', 'matar com carro', 'matar com moto', 'colidir propositalmente', 'arremessou o carro', 'abalroou'],
        icon: '🚗'
    },
    {
        codigo: 'RP-03',
        nome: 'Metagaming (MG)',
        descricao: 'Usar informações obtidas fora do jogo (Discord, stream, chat externo) para obter vantagem dentro do RP.',
        exemplos: [
            'Ver stream do inimigo e ir ao local que ele mencionou',
            'Usar informação de grupo de WhatsApp do jogo dentro do RP',
            'Combinar fora do jogo o que vai acontecer dentro',
            'Usar localização compartilhada externamente'
        ],
        penalidade: 'Aviso → Banimento temporário dependendo da gravidade',
        severidade: 'media',
        keywords: ['metagaming', 'meta', 'mg', 'informação de fora', 'usou stream', 'viu live', 'discord', 'grupo de whatsapp', 'combinou fora', 'vantagem de fora', 'saber por fora', 'informação externa', 'usou informação fora'],
        icon: '📡'
    },
    {
        codigo: 'RP-04',
        nome: 'Powergaming (PG)',
        descricao: 'Forçar ações irreais, impossíveis na vida real, ou não dar chance de reação ao outro jogador.',
        exemplos: [
            'Fugir de 5 policiais armados na mão sem RP de rendição',
            'Levantar de ferimentos graves sem parar',
            'Forçar ação sem emote ou sem dar chance ao outro responder',
            'Fazer coisas fisicamente impossíveis como personagem'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'media',
        keywords: ['powergaming', 'pg', 'forçar ação', 'impossível', 'irrealista', 'sem chance de reação', 'impossível na vida real', 'forçando ação', 'sem emote', 'não deu chance', 'ação forçada', 'agiu de forma irreal'],
        icon: '💪'
    },
    {
        codigo: 'RP-05',
        nome: 'NLR — New Life Rule',
        descricao: 'Após morrer, o personagem esquece tudo que aconteceu antes da morte. É proibido voltar ao local da morte ou se vingar diretamente.',
        exemplos: [
            'Morreu e voltou ao local do confronto',
            'Morreu e foi vingar do mesmo grupo imediatamente',
            'Lembrou de informações da vida anterior',
            'Voltou para pegar pertences da morte anterior'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'media',
        keywords: ['nlr', 'new life', 'nova vida', 'voltou após morrer', 'voltou ao local', 'vingança após morte', 'lembrou da morte', 'volta ao local', 'retornou após morrer', 'voltou se vingar', 'lembrou informação da morte'],
        icon: '💀'
    },
    {
        codigo: 'RP-06',
        nome: 'Combat Logging',
        descricao: 'Deslogar do servidor durante uma ação ativa de RP para evitar consequências (prisão, roubo, morte).',
        exemplos: [
            'Fechou o jogo durante uma abordagem policial',
            'Desconectou sendo roubado',
            'Saiu durante confronto armado',
            'Crashou propositalmente durante detenção'
        ],
        penalidade: 'Banimento temporário → Banimento permanente em reincidência',
        severidade: 'alta',
        keywords: ['combat log', 'combat logging', 'saiu do jogo', 'deslogou', 'fechou o jogo', 'desconectou', 'saiu durante', 'largou o jogo', 'desligou o jogo', 'crash proposital', 'saiu na hora', 'dc durante ação', 'off durante'],
        icon: '⛔'
    },
    {
        codigo: 'RP-07',
        nome: 'Anti-RP / Quebra de Imersão',
        descricao: 'Ações que quebram propositalmente a imersão do roleplay, como fazer piadas em situações sérias, agir como se fosse um jogo, ou não interpretar o personagem.',
        exemplos: [
            'Rir e zoar durante sequestro sério',
            'Falar fora de personagem no chat de ação',
            'Tratar situação grave como piada',
            'Não respeitar RP de outros jogadores'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'baixa',
        keywords: ['anti-rp', 'antirp', 'quebra de imersão', 'fora de personagem', 'ooc no jogo', 'não roleplayed', 'não interpretou', 'zoou a situação', 'piada em rp sério', 'quebrou imersão', 'brincou durante rp'],
        icon: '🎭'
    },
    {
        codigo: 'RP-08',
        nome: 'Fear RP',
        descricao: 'Não demonstrar medo em situação de risco real. Todo personagem deve temer pela vida quando em desvantagem clara (arma apontada, rendição, etc.).',
        exemplos: [
            'Correr com arma apontada na cabeça',
            'Atacar quando já está rendido e com arma na cabeça',
            'Não obedecer ordem de rendição com arma na cabeça',
            'Agir sem medo em situação de desvantagem óbvia'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'media',
        keywords: ['fear rp', 'fearrp', 'sem medo', 'não temeu', 'fugiu com arma na cabeça', 'correu rendido', 'não obedeceu rendição', 'arma apontada e fugiu', 'sem medo de morrer', 'não respeitou rendição', 'fugiu mesmo rendido'],
        icon: '😱'
    },
    {
        codigo: 'RP-09',
        nome: 'Fail RP',
        descricao: 'Agir de forma completamente não realista ou incoerente com a situação do personagem, quebrando a lógica do roleplay.',
        exemplos: [
            'Médico atirando em pacientes',
            'Personagem civil portando armamento de guerra sem contexto',
            'Agir de forma totalmente contraditória ao personagem',
            'Situação que seria impossível na realidade'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'baixa',
        keywords: ['fail rp', 'failrp', 'fora da realidade', 'incoerente', 'não faz sentido no rp', 'inconsistente', 'ação irreal', 'comportamento incoerente', 'fora do personagem', 'fora da lógica'],
        icon: '❌'
    },
    {
        codigo: 'RP-10',
        nome: 'Safe Zone — Zona Segura',
        descricao: 'Cometer crimes, confrontos ou ações hostis dentro de zonas declaradas seguras (hospitais, delegacia, spawn).',
        exemplos: [
            'Matar alguém dentro do hospital',
            'Assalto dentro da delegacia',
            'Confronto no ponto de spawn',
            'Roubo dentro da safe zone'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'media',
        keywords: ['safe zone', 'safezone', 'zona segura', 'hospital', 'delegacia', 'spawn', 'crime em zona segura', 'atirou no hospital', 'matou na delegacia', 'roubou na safe', 'brigar na safe zone'],
        icon: '🏥'
    },
    {
        codigo: 'RP-11',
        nome: 'Godmode / Ignorar Dano',
        descricao: 'Ignorar ferimentos, danos ou situações que deveriam incapacitar o personagem. Agir como invulnerável.',
        exemplos: [
            'Levar múltiplos tiros e continuar correndo normalmente',
            'Ignorar ferimento grave e continuar luta',
            'Não cair após ser baleado múltiplas vezes',
            'Agir como se não houvesse tomado dano algum'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'alta',
        keywords: ['godmode', 'god mode', 'invulnerável', 'ignorou tiro', 'ignorou dano', 'levou tiro e continuou', 'não caiu', 'não tomou dano', 'agiu como imortal', 'não sentiu nada', 'levou bala e fugiu'],
        icon: '🛡️'
    },
    {
        codigo: 'RP-12',
        nome: 'Bunny Hop / Abuse de Movimento',
        descricao: 'Usar spam de saltos ou movimentos mecânicos artificiais para fugir de situações de RP ou obter vantagem.',
        exemplos: [
            'Ficar pulando repetidamente para fugir',
            'Spam de rolada para desviar de tiros',
            'Usar bug de movimento para velocidade anormal',
            'Pular obstáculos de forma impossível na realidade'
        ],
        penalidade: 'Aviso → Banimento temporário',
        severidade: 'baixa',
        keywords: ['bunny hop', 'bunnyhop', 'spam de salto', 'pulando para fugir', 'spam de pulo', 'abuse de movimento', 'spam de rolada', 'movimento artificial', 'fuga com pulos'],
        icon: '🐇'
    },
    {
        codigo: 'RP-13',
        nome: 'Bug Abuse / Exploit',
        descricao: 'Explorar bugs, glitches ou falhas do jogo intencionalmente para obter vantagem injusta.',
        exemplos: [
            'Usar bug de parede para passar por lugares impossíveis',
            'Explorar glitch de dinheiro',
            'Usar exploit de arma para dano irreal',
            'Duplicar itens via bug'
        ],
        penalidade: 'Banimento temporário → Banimento permanente',
        severidade: 'alta',
        keywords: ['bug abuse', 'exploit', 'glitch', 'bug', 'falha do jogo', 'explorou bug', 'usou glitch', 'duplicou item', 'passage por parede', 'exploit de dinheiro', 'abusou de bug', 'usou exploit'],
        icon: '🐛'
    },
    {
        codigo: 'RP-14',
        nome: 'Comportamento Tóxico / Desrespeito',
        descricao: 'Ofensas, assédio, discurso de ódio, racismo, homofobia ou comportamento agressivo contra outros jogadores fora do contexto de RP.',
        exemplos: [
            'Xingamentos pessoais fora do RP',
            'Assédio a outro jogador',
            'Comentário racista ou preconceituoso',
            'Ameaças pessoais fora do roleplay'
        ],
        penalidade: 'Aviso → Banimento temporário → Banimento permanente',
        severidade: 'alta',
        keywords: ['tóxico', 'toxicidade', 'ofensa', 'xingamento', 'racismo', 'assédio', 'desrespeito', 'homofobia', 'ameaça pessoal', 'insulto', 'comentário preconceituoso', 'comportamento agressivo fora do rp', 'ofendeu jogador'],
        icon: '🚫'
    },
    {
        codigo: 'RP-15',
        nome: 'Spam / Flood de Ações',
        descricao: 'Spam de mensagens, ações, emotes ou comandos no servidor, prejudicando a experiência de outros jogadores.',
        exemplos: [
            'Spam de mensagens no chat de RP',
            'Usar emote repetidamente para travar servidor',
            'Spam de comandos do jogo',
            'Flood de texto no rádio ou chat'
        ],
        penalidade: 'Aviso → Kick → Banimento temporário',
        severidade: 'baixa',
        keywords: ['spam', 'flood', 'mensagem repetida', 'spam de chat', 'flood de mensagem', 'spam de emote', 'spam de comando', 'travou chat', 'flood no radio', 'mensagem em loop'],
        icon: '📢'
    },
    {
        codigo: 'ALERT-7',
        nome: '⚠️ Alert 7 — Decisão Gerencial',
        descricao: 'Situação que requer julgamento direto de um gerente ou administrador do servidor. Aplica-se quando o caso é complexo, ambíguo, envolve múltiplas regras em conflito, ou exige uma decisão que vai além das regras escritas.',
        exemplos: [
            'Conflito entre regras contraditórias',
            'Situação sem precedente nos regulamentos',
            'Acusação grave que exige investigação',
            'Caso em que múltiplas partes têm perspectivas válidas'
        ],
        penalidade: 'Definida pelo gerente/admin com base na análise do caso',
        severidade: 'gerencial',
        keywords: ['alert 7', 'alert7', 'decisão gerencial', 'admin', 'gerente', 'administrador', 'caso complexo', 'ambíguo', 'conflito de regras', 'sem precedente', 'julgamento', 'investigação', 'decisão especial'],
        icon: '⚠️',
        especial: true
    }
];

// Exporta para uso global
window.REGRAS_RP = REGRAS_RP;
