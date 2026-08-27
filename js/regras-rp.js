/**
 * OneCheck RP — Regras Completas do One State RP
 * Todas as categorias de regras (exceto infrações policiais internas)
 * Baseado nas diretrizes oficiais do One State RP Brasil
 *
 * Categorias:
 * - RP   → Regras de Roleplay
 * - COND → Conduta Geral
 * - CONTA→ Regras de Conta
 * - COM  → Comunicação
 * - ALERT→ Decisão Especial
 */

const REGRAS_RP = [

    // ══════════════════════════════════════════════════════
    // BLOCO 1 — REGRAS DE ROLEPLAY (RP)
    // ══════════════════════════════════════════════════════

    {
        codigo: 'RP-01',
        nome: 'DM — Deathmatch',
        descricao: 'Causar dano físico ou matar outro jogador sem uma motivação válida de Roleplay. Todo ataque deve ter contexto narrativo justificado dentro do RP.',
        exemplos: [
            'Atirou em mim sem nenhuma interação prévia ou motivo de RP',
            'Me matou apenas porque estava no mesmo local',
            'Atacou meu personagem sem qualquer provocação ou contexto',
            'Matou jogador aleatório na rua sem motivo'
        ],
        penalidade: '20 minutos de prisão administrativa / Kick / Ban temporário reincidente',
        severidade: 'alta',
        keywords: [
            'rdm', 'dm', 'deathmatch', 'random deathmatch', 'matou sem motivo',
            'atirou sem motivo', 'atacou sem motivo', 'sem contexto', 'matou aleatório',
            'matou sem razão', 'atirou sem razão', 'sem provocação', 'sem interação prévia',
            'matar aleatório', 'ataque sem motivo', 'tiro sem motivo', 'matar sem contexto',
            'mata tudo', 'matança aleatória', 'kill sem rp'
        ],
        icon: '💀'
    },
    {
        codigo: 'RP-02',
        nome: 'DMAuto — Deathmatch com Veículo',
        descricao: 'Usar veículo como arma para causar dano ou matar outro jogador, ou destruir veículos alheios, sem motivação válida de RP.',
        exemplos: [
            'Atropelou meu personagem propositalmente sem motivo',
            'Passou com o carro em cima de mim sem contexto de RP',
            'Destruiu meu veículo com o carro dele sem razão',
            'Usou carro como arma em tiroteio sem sequência lógica'
        ],
        penalidade: '20 minutos de prisão administrativa / Ban temporário reincidente',
        severidade: 'alta',
        keywords: [
            'vdm', 'dmauto', 'dm auto', 'atropelou', 'atropelamento', 'carro como arma',
            'veículo como arma', 'passou por cima', 'usou carro para matar', 'passou com moto',
            'atropelou de propósito', 'carro em cima', 'destruiu carro sem motivo',
            'ramming', 'ram', 'bateu de propósito', 'colidiu propositalmente'
        ],
        icon: '🚗'
    },
    {
        codigo: 'RP-03',
        nome: 'Power Gaming — Ações Impossíveis',
        descricao: 'Realizar ações que ultrapassam as capacidades físicas ou lógicas do personagem, ou forçar situações irreais contra outros jogadores sem consentimento.',
        exemplos: [
            'Fugiu de 5 policiais armados sozinho sem nenhum recurso',
            'Conseguiu hackear sistema instantaneamente sem qualificação no RP',
            'Forçou meu personagem a confessar usando /me sem dar chance de resposta',
            'Realizou ação física impossível para qualquer ser humano real'
        ],
        penalidade: '15 minutos de prisão administrativa / Advertência',
        severidade: 'media',
        keywords: [
            'power gaming', 'powergaming', 'pg', 'ação impossível', 'forçou ação',
            'fisicamente impossível', 'sem qualificação', 'forçou confissão', 'ação irreal',
            'forçou meu personagem', 'não deu chance', 'ação forçada', 'impossível de fazer',
            'capacidade irreal', 'habilidade impossível', 'super força', 'invencível'
        ],
        icon: '💪'
    },
    {
        codigo: 'RP-04',
        nome: 'NRP — Non RolePlay',
        descricao: 'Agir de forma completamente contrária à lógica do jogo real, quebrando a narrativa do RP com comportamentos que não fariam sentido na realidade.',
        exemplos: [
            'Médico assassinou paciente no hospital por diversão',
            'Personagem civil carregando arsenal militar sem qualquer contexto',
            'Agiu como se estivesse num videogame e não num RP sério',
            'Comportamento absurdo que nenhuma pessoa real teria naquela situação'
        ],
        penalidade: '15 minutos de prisão administrativa / Advertência',
        severidade: 'media',
        keywords: [
            'nrp', 'non roleplay', 'non rp', 'não faz sentido no rp', 'comportamento absurdo',
            'fora da lógica', 'irreal', 'incoerente com o rp', 'não é realista',
            'impossível na vida real', 'contraditório ao personagem', 'sem lógica de rp',
            'quebrou a lógica', 'agiu como jogo', 'tratou como game', 'fora do RP'
        ],
        icon: '🎭'
    },
    {
        codigo: 'RP-05',
        nome: 'Metagaming — Uso de Info OOC',
        descricao: 'Utilizar informações obtidas fora do jogo (Discord, lives, streams, chat fora do RP) para obter vantagem dentro do roleplay.',
        exemplos: [
            'Sabia onde eu estava escondido por ter visto na live do amigo',
            'Usou informação do Discord para me localizar no RP',
            'Sabia meu nome real no RP sem nunca ter sido apresentado',
            'Utilizou localização do mapa compartilhada fora do jogo'
        ],
        penalidade: '30 a 60 minutos de prisão / Mute de chat / Ban temporário',
        severidade: 'alta',
        keywords: [
            'metagaming', 'meta gaming', 'mg', 'informação de fora', 'informação ooc',
            'discord', 'live', 'stream', 'viu na live', 'sabia pelo discord',
            'usou info de fora', 'informação externa', 'fora do personagem soube',
            'meta', 'informação out of character', 'sabia sem ter sido apresentado',
            'localizou por fora do jogo', 'usou chat fora do rp'
        ],
        icon: '🔍'
    },
    {
        codigo: 'RP-06',
        nome: 'Abandono de RP / Combat Log',
        descricao: 'Desconectar do servidor, fugir para safezone ou realizar qualquer ação para evitar as consequências de uma situação de RP em andamento.',
        exemplos: [
            'Saiu do jogo no meio de uma abordagem policial',
            'Deslogou enquanto estava sendo perseguido',
            'Fugiu para a safezone enquanto era perseguido armado',
            'Fechou o jogo para não ser preso durante o RP'
        ],
        penalidade: '30 a 60 minutos de prisão / Ban temporário',
        severidade: 'alta',
        keywords: [
            'combat log', 'combatlog', 'abandono de rp', 'saiu do jogo', 'deslogou',
            'desconectou', 'fechou o jogo', 'saiu durante ação', 'saiu durante abordagem',
            'saiu enquanto perseguia', 'fugiu para safe', 'safezone para fugir',
            'entrou na safe durante perseguição', 'log out', 'disconnect', 'deixou o rp'
        ],
        icon: '🚪'
    },
    {
        codigo: 'RP-07',
        nome: 'Fear RP — Falta de Medo',
        descricao: 'Não demonstrar medo em situações de risco real. Todo personagem deve temer pela vida quando em desvantagem clara (arma apontada, rendição, etc.).',
        exemplos: [
            'Correu com arma apontada na cabeça',
            'Tentou atacar estando rendido e com arma na cabeça',
            'Não obedeceu ordem de rendição com arma apontada',
            'Agiu com coragem impossível estando em desvantagem clara'
        ],
        penalidade: 'Advertência / 20 minutos de prisão',
        severidade: 'media',
        keywords: [
            'fear rp', 'fearrp', 'sem medo', 'não temeu', 'não demonstrou medo',
            'fugiu com arma na cabeça', 'correu rendido', 'não obedeceu rendição',
            'arma apontada e fugiu', 'desvantagem e atacou', 'não respeitou rendição',
            'rendido e atacou', 'sem medo de morrer', 'ignorou arma apontada'
        ],
        icon: '😨'
    },
    {
        codigo: 'RP-08',
        nome: 'Fail RP — Roleplay Incoerente',
        descricao: 'Agir de forma completamente incoerente com o personagem ou situação, sem seguir a narrativa lógica do roleplay.',
        exemplos: [
            'Atirou em colega de trabalho no meio do expediente sem contexto',
            'Agiu de forma contraditória ao seu próprio personagem estabelecido',
            'Situação que não faria sentido nem minimamente na vida real',
            'Quebrou o próprio RP que havia iniciado'
        ],
        penalidade: 'Advertência / 15 minutos de prisão',
        severidade: 'baixa',
        keywords: [
            'fail rp', 'failrp', 'rp incoerente', 'incoerente com o personagem',
            'contraditório', 'quebrou o próprio rp', 'não faz sentido no rp',
            'personagem inconsistente', 'comportamento incoerente', 'rp mal feito',
            'não seguiu o rp', 'quebrou a narrativa', 'personagem fora do contexto'
        ],
        icon: '❓'
    },
    {
        codigo: 'RP-09',
        nome: 'NLR — New Life Rule',
        descricao: 'Após a morte do personagem, o jogador deve "renascer" sem memória dos eventos que levaram à morte. É proibido agir com base em situações anteriores à morte.',
        exemplos: [
            'Voltou ao mesmo lugar onde morreu e atacou quem o matou',
            'Lembrou de quem o matou e foi se vingar logo após morrer',
            'Revelou localização de quem o matou logo após renascer',
            'Interferiu no mesmo cenário imediatamente após a morte'
        ],
        penalidade: 'Advertência / 20 minutos de prisão',
        severidade: 'media',
        keywords: [
            'nlr', 'new life rule', 'voltou após morrer', 'volta do mesmo lugar',
            'lembrou após morrer', 'vingança após morte', 'voltou para o mesmo rp',
            'não esqueceu após morte', 'interferiu após morrer', 'renasceu e voltou',
            'após morrer foi atrás', 'morte anterior', 'regra de nova vida'
        ],
        icon: '💫'
    },
    {
        codigo: 'RP-10',
        nome: 'Safe Zone — Zona Segura',
        descricao: 'Cometer ações hostis dentro de zonas protegidas (hospitais, delegacia, spawn) ou usar a safezone para se proteger propositalmente de situações de RP.',
        exemplos: [
            'Me atacou dentro do hospital',
            'Realizou assalto dentro da delegacia',
            'Fugiu para a safezone para evitar abordagem policial',
            'Iniciou confronto no ponto de spawn'
        ],
        penalidade: 'Advertência / 20 minutos de prisão',
        severidade: 'media',
        keywords: [
            'safe zone', 'safezone', 'zona segura', 'hospital', 'delegacia', 'spawn',
            'crime na safe', 'atirou na safezone', 'fugiu para safe', 'crime no hospital',
            'confronto na safe', 'zona protegida', 'abuso de safezone', 'safe abuse',
            'entrou na safe durante ação', 'usou safe para fugir', 'roubo na safezone'
        ],
        icon: '🏥'
    },
    {
        codigo: 'RP-11',
        nome: 'Godmode — Ignorar Danos',
        descricao: 'Ignorar ferimentos, danos ou situações que deveriam incapacitar o personagem. Agir como se fosse invulnerável ou imortal.',
        exemplos: [
            'Levou vários tiros e continuou correndo normalmente',
            'Ignorou ferimento grave e continuou lutando',
            'Não caiu após ser baleado múltiplas vezes',
            'Agiu como se nenhum dano tivesse sido causado'
        ],
        penalidade: 'Advertência / 20 minutos de prisão / Ban temporário',
        severidade: 'alta',
        keywords: [
            'godmode', 'god mode', 'invulnerável', 'imortal', 'ignorou tiro',
            'ignorou dano', 'levou tiro e continuou', 'não caiu', 'não tomou dano',
            'agiu como imortal', 'não sentiu nada', 'levou bala e fugiu', 'ignorou ferimento',
            'continuou após múltiplos tiros', 'resistência impossível a dano'
        ],
        icon: '🛡️'
    },
    {
        codigo: 'RP-12',
        nome: 'Bunny Hop / Abuso de Movimento',
        descricao: 'Usar spam de saltos, roladas ou movimentos mecânicos artificiais para fugir de situações de RP ou obter vantagem injusta.',
        exemplos: [
            'Ficou pulando repetidamente para escapar de abordagem',
            'Spam de roladas para desviar de tiros de forma antinatural',
            'Usou bug de movimento para velocidade anormal',
            'Saltou obstáculos de forma impossível para um humano'
        ],
        penalidade: 'Advertência / 15 minutos de prisão',
        severidade: 'baixa',
        keywords: [
            'bunny hop', 'bunnyhop', 'spam de salto', 'spam de pulo', 'pulando para fugir',
            'spam de rolada', 'movimento artificial', 'fuga com pulos', 'abuse de movimento',
            'movimento impossível', 'velocidade irreal', 'salt para fugir', 'rolada spam'
        ],
        icon: '🐇'
    },
    {
        codigo: 'RP-13',
        nome: 'Bug Abuse / Exploit',
        descricao: 'Explorar bugs, glitches ou falhas do sistema do jogo intencionalmente para obter vantagem injusta sobre outros jogadores.',
        exemplos: [
            'Usou bug de parede para passar por lugares impossíveis',
            'Explorou glitch para duplicar dinheiro ou itens',
            'Usou exploit de arma para dano irreal',
            'Abusou de falha do jogo para vantagem'
        ],
        penalidade: 'Ban temporário / Ban permanente reincidente',
        severidade: 'alta',
        keywords: [
            'bug abuse', 'bugabuse', 'exploit', 'glitch', 'bug', 'falha do jogo',
            'explorou bug', 'usou glitch', 'duplicou item', 'passou por parede',
            'exploit de dinheiro', 'abusou de bug', 'usou exploit', 'cheat', 'hack',
            'trapaça', 'bug intencional', 'falha intencional'
        ],
        icon: '🐛'
    },
    {
        codigo: 'RP-14',
        nome: 'Anti-RP — Quebra de Imersão',
        descricao: 'Ações que quebram propositalmente a imersão do roleplay: fazer piadas em situações sérias, agir como se estivesse num videogame, ou não interpretar o personagem.',
        exemplos: [
            'Riu e zoou durante sequestro sério',
            'Tratou tiroteio grave como piada ou brincadeira',
            'Não respeitou o RP dos outros jogadores',
            'Brincou durante situação dramática séria de RP'
        ],
        penalidade: 'Advertência / 15 minutos de prisão',
        severidade: 'baixa',
        keywords: [
            'anti-rp', 'antirp', 'quebra de imersão', 'quebrou imersão', 'zoou o rp',
            'piada em rp sério', 'brincou durante rp', 'não interpretou personagem',
            'tratou como jogo', 'não respeitou rp', 'fora do personagem', 'rp sem seriedade',
            'desrespeitou rp alheio', 'imersão quebrada', 'personagem não interpretado'
        ],
        icon: '🎮'
    },
    {
        codigo: 'RP-15',
        nome: 'RP em Benefício Próprio — Abuso de Comandos',
        descricao: 'Uso abusivo ou desonesto de comandos de RP como /me, /do, /try para se favorecer injustamente durante uma interação, sem dar possibilidade real de resposta.',
        exemplos: [
            'Usou /me para forçar ação em outro jogador sem resposta possível',
            'Abusou de /try para sempre conseguir o que queria',
            'Utilizou /do para criar situação impossível que beneficiava só ele',
            'Manipulou comandos de RP para obter vantagem injusta'
        ],
        penalidade: 'Advertência / 15 minutos de prisão',
        severidade: 'baixa',
        keywords: [
            'abuso de /me', 'abuso de /do', 'abuso de /try', 'forçou ação com me',
            'benefício próprio no rp', 'manipulou comandos rp', 'rp vantagem injusta',
            '/me para forçar', '/do injusto', 'comando de rp abusado', 'abuso de emote',
            'forçou situação com comando', 'usou me para vencer'
        ],
        icon: '⚖️'
    },

    // ══════════════════════════════════════════════════════
    // BLOCO 2 — CONDUTA GERAL
    // ══════════════════════════════════════════════════════

    {
        codigo: 'COND-01',
        nome: 'Toxicidade / Discriminação / Desrespeito',
        descricao: 'Ofensas pessoais, assédio, racismo, homofobia, xenofobia, linguagem de ódio ou comportamento agressivo contra outros jogadores fora ou dentro do contexto de RP.',
        exemplos: [
            'Xingamentos pessoais e ofensas fora do RP',
            'Comentário racista ou preconceituoso',
            'Assédio a outro jogador dentro ou fora do jogo',
            'Ameaças pessoais reais fora do contexto do roleplay'
        ],
        penalidade: 'Advertência / Ban temporário / Ban permanente (discriminação grave)',
        severidade: 'alta',
        keywords: [
            'tóxico', 'toxicidade', 'racismo', 'racista', 'homofobia', 'ofensa pessoal',
            'assédio', 'xingamento pessoal', 'insulto', 'discriminação', 'ameaça pessoal',
            'xenofobia', 'ódio', 'discurso de ódio', 'preconceito', 'bullying',
            'linguagem ofensiva', 'agressividade fora do rp', 'desrespeito pessoal'
        ],
        icon: '🚫'
    },
    {
        codigo: 'COND-02',
        nome: 'Spam / Flood de Mensagens ou Ações',
        descricao: 'Envio repetitivo e abusivo de mensagens no chat, spam de comandos, emotes ou qualquer ação que perturbe a experiência de outros jogadores.',
        exemplos: [
            'Spam de mensagens no chat de RP',
            'Usar emote repetidamente para prejudicar o servidor',
            'Flood de comandos do jogo consecutivamente',
            'Spam no rádio ou chat geral'
        ],
        penalidade: 'Advertência / Kick / Mute / Ban temporário',
        severidade: 'baixa',
        keywords: [
            'spam', 'flood', 'mensagem repetida', 'spam de chat', 'flood de mensagem',
            'spam de emote', 'spam de comando', 'chat travado', 'flood no rádio',
            'mensagem em loop', 'repetição de mensagem', 'spam de ação', 'chat abusado'
        ],
        icon: '📢'
    },
    {
        codigo: 'COND-03',
        nome: 'OOC no IC — Comunicação Fora do Personagem',
        descricao: 'Usar o chat de jogo para conversas fora do personagem (OOC) sem usar o comando /n obrigatório. Toda comunicação não-RP deve ser feita com o prefixo /n.',
        exemplos: [
            'Escreveu mensagem pessoal no chat sem usar /n',
            'Discutiu sobre regras no chat de ação sem o prefixo correto',
            'Conversou sobre a vida real no chat de RP',
            'Reclamou de algo fora do personagem sem usar /n'
        ],
        penalidade: 'Aviso / Advertência',
        severidade: 'baixa',
        keywords: [
            'ooc no ic', 'fora do personagem no chat', 'sem usar /n', 'chat fora do rp',
            'comunicação ooc', 'mensagem ooc no ic', 'falou fora do personagem',
            'não usou /n', 'chat de ação com ooc', 'vida real no rp chat',
            'out of character no jogo', '/n obrigatório', 'regras no chat ic'
        ],
        icon: '💬'
    },
    {
        codigo: 'COND-04',
        nome: 'Assédio / Perseguição a Jogadores',
        descricao: 'Perseguir, assediar ou prejudicar sistematicamente um jogador específico por motivos pessoais, fora do contexto do RP.',
        exemplos: [
            'Ficou seguindo e perturbando um jogador específico propositalmente',
            'Coordenou ataques repetidos ao mesmo jogador por perseguição pessoal',
            'Tentou prejudicar experiência de um jogador por motivos pessoais',
            'Perseguição sistemática fora do contexto de RP'
        ],
        penalidade: 'Advertência / Ban temporário / Ban permanente',
        severidade: 'alta',
        keywords: [
            'assédio', 'perseguição', 'griefer', 'griefing', 'motivos pessoais',
            'perseguindo jogador', 'ataques repetidos ao mesmo', 'prejudicar por pessoal',
            'troll', 'trolling', 'perturbar jogador', 'targeting', 'alvo pessoal',
            'segue e perturba', 'perseguição sistemática'
        ],
        icon: '👁️'
    },

    // ══════════════════════════════════════════════════════
    // BLOCO 3 — REGRAS DE CONTA
    // ══════════════════════════════════════════════════════

    {
        codigo: 'CONTA-01',
        nome: 'RMT — Real Money Trade',
        descricao: 'Vender, comprar ou trocar itens, dinheiro ou bens do jogo por dinheiro real. Qualquer transação financeira real relacionada ao jogo é estritamente proibida.',
        exemplos: [
            'Vendeu dinheiro do jogo por dinheiro real',
            'Comprou itens do jogo por Pix ou transferência bancária',
            'Anunciou venda de conta por valor em dinheiro real',
            'Trocou bens do jogo por produtos reais'
        ],
        penalidade: 'Ban permanente',
        severidade: 'alta',
        keywords: [
            'rmt', 'real money trade', 'venda de dinheiro', 'compra de dinheiro',
            'pix por item', 'item por pix', 'vender conta', 'comprar conta',
            'dinheiro real por jogo', 'item real por jogo', 'transferência por item',
            'venda de recurso do jogo', 'compra de recurso real', 'money trade'
        ],
        icon: '💰'
    },
    {
        codigo: 'CONTA-02',
        nome: 'Venda / Compartilhamento de Conta',
        descricao: 'Vender, comprar, emprestar, compartilhar ou transferir contas do jogo para outros usuários.',
        exemplos: [
            'Vendeu a conta para outro jogador',
            'Emprestou a conta para amigo usar',
            'Comprou conta de outro jogador',
            'Compartilhou login e senha da conta'
        ],
        penalidade: 'Ban permanente da conta',
        severidade: 'alta',
        keywords: [
            'venda de conta', 'compra de conta', 'emprestou conta', 'compartilhou conta',
            'login compartilhado', 'senha compartilhada', 'transfer de conta',
            'outra pessoa na conta', 'conta vendida', 'conta emprestada'
        ],
        icon: '🔑'
    },
    {
        codigo: 'CONTA-03',
        nome: 'Multi-Conta — Contas Múltiplas',
        descricao: 'Criar ou usar mais de 3 contas no mesmo dispositivo. Também é proibido usar contas alternativas para driblar punições (ban evade).',
        exemplos: [
            'Criou conta nova para escapar de ban',
            'Usa mais de 3 contas no mesmo celular/PC',
            'Entrou com conta alternativa após ser banido',
            'Multi-conta para vantagem de recursos'
        ],
        penalidade: 'Ban permanente de todas as contas',
        severidade: 'alta',
        keywords: [
            'multi-conta', 'multiconta', 'conta alternativa', 'alt account', 'ban evade',
            'fugiu do ban', 'nova conta após ban', 'mais de 3 contas', 'múltiplas contas',
            'conta extra', 'segundo personagem para ban', 'evadiu punição', 'bypass ban'
        ],
        icon: '👥'
    },
    {
        codigo: 'CONTA-04',
        nome: 'Hack / Cheat / Modificação Ilegal',
        descricao: 'Usar qualquer tipo de software de trapaça, modificação do cliente do jogo, bot, macro ou ferramenta externa para obter vantagens ilícitas.',
        exemplos: [
            'Usou aimbot para mira automática',
            'Speed hack para movimento mais rápido',
            'Wallhack para ver jogadores através de paredes',
            'Bot ou macro para automação de ações'
        ],
        penalidade: 'Ban permanente imediato',
        severidade: 'alta',
        keywords: [
            'hack', 'hacker', 'cheat', 'cheater', 'aimbot', 'wallhack', 'speed hack',
            'speedhack', 'bot', 'macro', 'modificação ilegal', 'trainer', 'mod ilegal',
            'software de trapaça', 'mira automática', 'atravessou parede', 'velocidade hack',
            'viu através da parede', 'script ilegal', 'exploit externo'
        ],
        icon: '⚠️'
    },

    // ══════════════════════════════════════════════════════
    // BLOCO 4 — COMUNICAÇÃO E RP AVANÇADO
    // ══════════════════════════════════════════════════════

    {
        codigo: 'COM-01',
        nome: 'Abuso de Comandos de RP (/me, /do, /try)',
        descricao: 'Usar comandos de emote e RP de forma desonesta ou prejudicial: descrever ações impossíveis, forçar resultados sem consenso, ou usar para obter vantagem.',
        exemplos: [
            '/me destrói todos os inimigos instantaneamente sem dar chance',
            '/do de forma a criar situação impossível que só beneficia a si',
            '/try sempre bem-sucedido de forma impossível',
            'Usou /me para declarar ação que impossibilita resposta do outro'
        ],
        penalidade: 'Advertência / 15 minutos de prisão',
        severidade: 'baixa',
        keywords: [
            '/me abusado', '/do abusado', '/try abusado', 'abuso de emote',
            'comando rp desonesto', 'forçou com /me', 'resultado impossível /try',
            'ação impossível no /me', '/do criou situação irreal', 'emote de vantagem'
        ],
        icon: '📝'
    },
    {
        codigo: 'COM-02',
        nome: 'Informação OOC Revelada Indevidamente',
        descricao: 'Revelar informações obtidas fora do RP (localização, identidade, planos) para outros jogadores de forma que afete o jogo, violando o metagaming.',
        exemplos: [
            'Contou no Discord onde ficava o esconderijo da facção rival',
            'Revelou identidade real de outro personagem via mensagem privada OOC',
            'Compartilhou coordenadas ou localização fora do jogo',
            'Divulgou planos do servidor via chat externo'
        ],
        penalidade: 'Advertência / Mute / Ban temporário',
        severidade: 'media',
        keywords: [
            'revelou localização ooc', 'contou no discord', 'revelou identidade ooc',
            'compartilhou localização fora', 'divulgou plano fora', 'spoiler do rp',
            'informação vazada', 'revelou esconderijo', 'coordenadas compartilhadas'
        ],
        icon: '📡'
    },
    {
        codigo: 'COM-03',
        nome: 'Incitação / Provocação Sistemática',
        descricao: 'Provocar outros jogadores intencionalmente de forma sistemática para gerar reações negativas, criar conflitos desnecessários ou prejudicar o ambiente do servidor.',
        exemplos: [
            'Ficou provocando o mesmo jogador repetidamente até ele reagir',
            'Criou situações propositais para fazer outro jogador infringir regras',
            'Incitou outros jogadores a quebrarem regras',
            'Armadilha sistemática para banir outro jogador'
        ],
        penalidade: 'Advertência / Ban temporário',
        severidade: 'media',
        keywords: [
            'incitação', 'provocação sistemática', 'provocou para reagir', 'criou armadilha',
            'incitou a quebrar regra', 'provocação intencional', 'fez questão de provocar',
            'armou para punir outro', 'baiting', 'bait para ban', 'provocou até reagir'
        ],
        icon: '🎣'
    },

    // ══════════════════════════════════════════════════════
    // BLOCO 5 — ESPECIAL
    // ══════════════════════════════════════════════════════

    {
        codigo: 'ALERT-7',
        nome: '⭐ Alert 7 — Decisão Gerencial',
        descricao: 'Situação que requer julgamento direto de um gerente ou administrador do servidor. Aplica-se quando o caso é complexo, ambíguo, envolve múltiplas regras em conflito, não possui precedente claro, ou exige uma decisão que vai além das regras escritas. Todo caso sem enquadramento claro cai aqui.',
        exemplos: [
            'Conflito entre regras contraditórias sem precedente',
            'Situação absolutamente nova nos regulamentos',
            'Acusação grave que exige investigação aprofundada',
            'Múltiplas partes com perspectivas válidas conflitantes'
        ],
        penalidade: 'Definida pelo gerente/admin com base na análise completa do caso',
        severidade: 'gerencial',
        keywords: [
            'alert 7', 'alert7', 'decisão gerencial', 'admin', 'gerente', 'administrador',
            'caso complexo', 'ambíguo', 'conflito de regras', 'sem precedente',
            'julgamento', 'investigação', 'decisão especial', 'caso especial',
            'múltiplas regras', 'conflito de interpretação', 'chamar gerente',
            'precisa de admin', 'situação não prevista', 'regra conflitante'
        ],
        icon: '⭐',
        especial: true
    }
];

// ── Helpers ──────────────────────────────────────────────────

/**
 * Retorna metadados de cor/ícone por severidade
 */
function getSeveridadeLabel(sev) {
    const map = {
        'alta':      { label: 'GRAVE',     color: '#ef4444', icon: '🔴' },
        'media':     { label: 'MODERADA',  color: '#f59e0b', icon: '🟡' },
        'baixa':     { label: 'LEVE',      color: '#22c55e', icon: '🟢' },
        'gerencial': { label: 'ALERT 7',   color: '#a855f7', icon: '⭐' }
    };
    return map[sev] || map['baixa'];
}

/**
 * Retorna regras agrupadas por categoria
 */
function getRegrasAgrupadas() {
    return {
        'Roleplay (RP)':        REGRAS_RP.filter(r => r.codigo.startsWith('RP-')),
        'Conduta Geral':        REGRAS_RP.filter(r => r.codigo.startsWith('COND-')),
        'Regras de Conta':      REGRAS_RP.filter(r => r.codigo.startsWith('CONTA-')),
        'Comunicação':          REGRAS_RP.filter(r => r.codigo.startsWith('COM-')),
        'Decisão Especial':     REGRAS_RP.filter(r => r.codigo.startsWith('ALERT'))
    };
}

// Exportar para uso global
window.REGRAS_RP         = REGRAS_RP;
window.getSeveridadeLabel = getSeveridadeLabel;
window.getRegrasAgrupadas = getRegrasAgrupadas;
