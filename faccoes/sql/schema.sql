-- ============================================================
--  GoddoY RK — Schema Completo do Banco de Dados
--  PostgreSQL / Supabase
--  Execute este script no SQL Editor do Supabase
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
--  MEMBROS (usuários da plataforma)
-- ============================================================
CREATE TABLE IF NOT EXISTS membros (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nick            VARCHAR(50)  NOT NULL UNIQUE,
    pin_hash        VARCHAR(255) NOT NULL,          -- bcrypt do PIN de 4 dígitos
    cargo           VARCHAR(20)  NOT NULL DEFAULT 'Recruta'
                    CHECK (cargo IN ('Recruta','Membro','Veterano','Oficial','Tenente','Gerente','Lider')),
    nivel           INTEGER      NOT NULL DEFAULT 1 CHECK (nivel >= 1 AND nivel <= 100),
    nivel_ak        INTEGER      NOT NULL DEFAULT 1 CHECK (nivel_ak >= 1 AND nivel_ak <= 50),
    pontos          INTEGER      NOT NULL DEFAULT 0 CHECK (pontos >= 0),
    avatar_url      TEXT,
    bio             VARCHAR(200),
    is_admin        BOOLEAN      NOT NULL DEFAULT false,
    is_ativo        BOOLEAN      NOT NULL DEFAULT true,
    nivel_notificado INTEGER     DEFAULT 1,         -- último nível notificado
    nivel_ak_notificado INTEGER  DEFAULT 1,         -- último nível AK notificado
    ultimo_acesso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_membros_nick     ON membros(nick);
CREATE INDEX IF NOT EXISTS idx_membros_cargo    ON membros(cargo);
CREATE INDEX IF NOT EXISTS idx_membros_is_admin ON membros(is_admin);
CREATE INDEX IF NOT EXISTS idx_membros_is_ativo ON membros(is_ativo);

-- ── Inserir admin mestre (PIN definido via env var — hash aqui é placeholder)
-- Será criado via Netlify Function na primeira execução


-- ============================================================
--  SESSÕES (tokens de dispositivo)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessoes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID        NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,       -- hash do JWT
    device_info TEXT,                               -- "iPhone 14, iOS 17"
    lembrar     BOOLEAN NOT NULL DEFAULT false,     -- "lembrar este dispositivo"
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_membro   ON sessoes(membro_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_expires  ON sessoes(expires_at);

-- Limpar sessões expiradas automaticamente (cron via Supabase pg_cron ou Netlify)


-- ============================================================
--  TEMPORADA / CONFIGURAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
    chave   VARCHAR(60) PRIMARY KEY,
    valor   TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valores padrão
INSERT INTO config (chave, valor) VALUES
    ('temporada_atual',     '75'),
    ('temporada_inicio',    '2026-08-19'),
    ('temporada_fim',       '2026-09-01'),
    ('nome_gangue',         'GoddoY RK'),
    ('max_membros',         '45'),
    ('pvp_horario',         '20:00'),
    ('evento_horario',      '21:00'),
    ('pvp_dias',            '1,3,5'),   -- seg, qua, sex
    ('evento_dias',         '0,6')      -- dom, sáb
ON CONFLICT (chave) DO NOTHING;


-- ============================================================
--  PUSH SUBSCRIPTIONS (notificações push)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id       UUID    NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    endpoint        TEXT    NOT NULL,
    p256dh          TEXT    NOT NULL,
    auth_key        TEXT    NOT NULL,
    device_label    TEXT,                           -- "iPhone João"
    ativo           BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(membro_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_membro ON push_subscriptions(membro_id);
CREATE INDEX IF NOT EXISTS idx_push_ativo  ON push_subscriptions(ativo);


-- ============================================================
--  NOTIFICAÇÕES (log interno)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID         REFERENCES membros(id) ON DELETE SET NULL,
    titulo      VARCHAR(200) NOT NULL,
    mensagem    TEXT         NOT NULL,
    tipo        VARCHAR(30)  NOT NULL  -- tarefa, evento, pvp, promocao, denuncia, nivel, ak
                CHECK (tipo IN ('tarefa','evento','pvp','promocao','denuncia','nivel','ak','geral')),
    referencia_id UUID,               -- id do post/tarefa/denuncia relacionado
    lida        BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_membro ON notificacoes(membro_id);
CREATE INDEX IF NOT EXISTS idx_notif_lida   ON notificacoes(membro_id, lida);


-- ============================================================
--  CHAT GERAL
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens_gerais (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID    NOT NULL REFERENCES membros(id) ON DELETE SET NULL,
    nick        VARCHAR(50) NOT NULL,               -- snapshot do nick na hora
    cargo       VARCHAR(20) NOT NULL,               -- snapshot do cargo
    tipo        VARCHAR(10) NOT NULL DEFAULT 'texto'
                CHECK (tipo IN ('texto','audio','sistema','imagem')),
    conteudo    TEXT        NOT NULL,
    media_url   TEXT,                               -- URL Supabase Storage
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_geral_ts ON mensagens_gerais(created_at DESC);


-- ============================================================
--  CONVERSAS PRIVADAS (DMs)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro1_id  UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    membro2_id  UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    ultima_msg  TEXT,
    ultima_msg_ts TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (membro1_id <> membro2_id),
    UNIQUE (
        LEAST(membro1_id::TEXT, membro2_id::TEXT)::UUID,
        GREATEST(membro1_id::TEXT, membro2_id::TEXT)::UUID
    )
);

CREATE INDEX IF NOT EXISTS idx_conv_m1 ON conversas(membro1_id);
CREATE INDEX IF NOT EXISTS idx_conv_m2 ON conversas(membro2_id);

CREATE TABLE IF NOT EXISTS mensagens_dm (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id     UUID    NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
    remetente_id    UUID    NOT NULL REFERENCES membros(id) ON DELETE SET NULL,
    tipo            VARCHAR(10) NOT NULL DEFAULT 'texto'
                    CHECK (tipo IN ('texto','audio','imagem')),
    conteudo        TEXT    NOT NULL,
    media_url       TEXT,
    lida            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversa ON mensagens_dm(conversa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_remetente ON mensagens_dm(remetente_id);
CREATE INDEX IF NOT EXISTS idx_dm_lida ON mensagens_dm(conversa_id, lida);


-- ============================================================
--  FEED SOCIAL (posts com fotos/vídeos)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID    NOT NULL REFERENCES membros(id) ON DELETE SET NULL,
    nick        VARCHAR(50) NOT NULL,
    cargo       VARCHAR(20) NOT NULL,
    conteudo    TEXT,                               -- pode ser apenas mídia
    media_url   TEXT,                               -- foto ou vídeo
    media_tipo  VARCHAR(10)                         -- foto, video
                CHECK (media_tipo IN ('foto','video') OR media_tipo IS NULL),
    likes       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_feed      ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_membro    ON posts(membro_id);

-- Likes nos posts
CREATE TABLE IF NOT EXISTS post_likes (
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    membro_id   UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, membro_id)
);

-- Comentários nos posts
CREATE TABLE IF NOT EXISTS comentarios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    membro_id   UUID    NOT NULL REFERENCES membros(id) ON DELETE SET NULL,
    nick        VARCHAR(50) NOT NULL,
    conteudo    VARCHAR(500) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_post ON comentarios(post_id, created_at);


-- ============================================================
--  DENÚNCIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS denuncias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denunciante_id      UUID    NOT NULL REFERENCES membros(id) ON DELETE SET NULL,
    nick_denunciante    VARCHAR(50) NOT NULL,
    nick_denunciado     VARCHAR(50) NOT NULL,       -- nick do infrator (pode ser externo)
    tipo_denuncia       VARCHAR(40) NOT NULL
                        CHECK (tipo_denuncia IN (
                            'dm_sem_motivo',
                            'rdm_na_rua',
                            'taser_veiculo',
                            'invasao_territorio',
                            'desrespeito_toxicidade',
                            'contra_integrante',
                            'outro'
                        )),
    descricao           TEXT NOT NULL,
    evidencia_url       TEXT,                       -- URL Supabase Storage
    evidencia_tipo      VARCHAR(5)                  -- foto, video
                        CHECK (evidencia_tipo IN ('foto','video') OR evidencia_tipo IS NULL),
    status              VARCHAR(20) NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','analisando','resolvido','arquivado')),
    admin_nota          TEXT,                       -- resposta do admin
    admin_id            UUID REFERENCES membros(id),
    resolvido_em        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_denuncia_status      ON denuncias(status);
CREATE INDEX IF NOT EXISTS idx_denuncia_denunciante ON denuncias(denunciante_id);
CREATE INDEX IF NOT EXISTS idx_denuncia_ts          ON denuncias(created_at DESC);


-- ============================================================
--  TAREFAS / MISSÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo      VARCHAR(100) NOT NULL,
    descricao   TEXT         NOT NULL,
    pontos      INTEGER      NOT NULL DEFAULT 500 CHECK (pontos >= 0),
    criado_por  UUID REFERENCES membros(id) ON DELETE SET NULL,
    ativa       BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarefas_ativa ON tarefas(ativa);

-- Registro de conclusões de tarefas
CREATE TABLE IF NOT EXISTS tarefas_concluidas (
    tarefa_id   UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    membro_id   UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    concluida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tarefa_id, membro_id)
);


-- ============================================================
--  EVENTOS E HORÁRIOS (agenda para push)
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo          VARCHAR(100) NOT NULL,
    tipo            VARCHAR(10)  NOT NULL CHECK (tipo IN ('evento','pvp','treino','reuniao')),
    horario         TIME         NOT NULL,           -- ex: '20:00'
    dias_semana     INTEGER[]    NOT NULL DEFAULT '{0,1,2,3,4,5,6}',  -- 0=Dom .. 6=Sáb
    minutos_aviso   INTEGER      NOT NULL DEFAULT 15, -- notificar X min antes
    mensagem_push   TEXT,                             -- mensagem personalizada
    ativo           BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Inserir eventos padrão
INSERT INTO eventos (titulo, tipo, horario, dias_semana, minutos_aviso, mensagem_push) VALUES
    ('PVP Noturno',    'pvp',    '20:00', '{1,3,5}', 15, '🎯 PVP em 15 minutos! Mobilize a gangue GoddoY RK!'),
    ('Evento Semanal', 'evento', '21:00', '{0,6}',   30, '🔥 Evento em 30 minutos! Venha representar a GoddoY RK!')
ON CONFLICT DO NOTHING;


-- ============================================================
--  PONTUAÇÃO — HISTÓRICO
-- ============================================================
CREATE TABLE IF NOT EXISTS pontuacao_historico (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID    NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    nick        VARCHAR(50) NOT NULL,
    pontos      INTEGER NOT NULL,                   -- positivo=ganhou, negativo=perdeu
    motivo      VARCHAR(200) NOT NULL,
    admin_id    UUID REFERENCES membros(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pts_membro ON pontuacao_historico(membro_id, created_at DESC);


-- ============================================================
--  PROMOÇÕES — HISTÓRICO
-- ============================================================
CREATE TABLE IF NOT EXISTS promocoes_historico (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID    NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    nick        VARCHAR(50) NOT NULL,
    cargo_ant   VARCHAR(20) NOT NULL,
    cargo_novo  VARCHAR(20) NOT NULL,
    motivo      VARCHAR(200) NOT NULL,
    admin_id    UUID REFERENCES membros(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prom_membro ON promocoes_historico(membro_id, created_at DESC);


-- ============================================================
--  CONQUISTAS DA TEMPORADA
-- ============================================================
CREATE TABLE IF NOT EXISTS conquistas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada       INTEGER NOT NULL,
    tipo            VARCHAR(40) NOT NULL,            -- atirador_elite, mais_rico, mvp, etc.
    nick_vencedor   VARCHAR(50),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (temporada, tipo)
);


-- ============================================================
--  STORAGE BUCKETS (Supabase Storage)
--  Execute separadamente no Supabase Storage ou via API
-- ============================================================
-- Bucket: avatares       (public)  — fotos de perfil
-- Bucket: posts-media    (public)  — fotos e vídeos do feed
-- Bucket: denuncias-evidencias (private) — evidências de denúncias
-- Bucket: chat-audio     (private) — áudios do chat


-- ============================================================
--  FUNÇÕES AUXILIARES
-- ============================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_membros_updated_at
    BEFORE UPDATE ON membros
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trigger_config_updated_at
    BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

-- Atualizar likes ao inserir/deletar post_likes
CREATE OR REPLACE FUNCTION atualizar_likes_post()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_likes
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION atualizar_likes_post();

-- Atualizar última mensagem da conversa
CREATE OR REPLACE FUNCTION atualizar_ultima_msg()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversas
    SET ultima_msg = LEFT(NEW.conteudo, 60),
        ultima_msg_ts = NEW.created_at
    WHERE id = NEW.conversa_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ultima_msg
    AFTER INSERT ON mensagens_dm
    FOR EACH ROW EXECUTE FUNCTION atualizar_ultima_msg();


-- ============================================================
--  ROW LEVEL SECURITY (RLS)
--  Ativa segurança por linha — IMPORTANTE para Supabase
-- ============================================================
ALTER TABLE membros               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_gerais      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_dm          ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE denuncias             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_concluidas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontuacao_historico   ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocoes_historico   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conquistas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE config                ENABLE ROW LEVEL SECURITY;

-- Toda leitura/escrita passa pela service_role key (Netlify Functions)
-- A anon key tem acesso apenas via Realtime (sem RLS bypass)
-- Todas as operações autenticadas passam pelas Netlify Functions que usam service_role

-- Políticas básicas: negar tudo para anon, permitir tudo para service_role
-- (service_role bypassa RLS por padrão no Supabase)


-- ============================================================
--  REALTIME — Habilitar para tabelas de chat e feed
-- ============================================================
-- Execute no Supabase: Database → Replication → Tables
-- Habilitar para: mensagens_gerais, mensagens_dm, posts, notificacoes


-- ============================================================
--  RESUMO DAS VARIÁVEIS DE AMBIENTE PARA O NETLIFY
-- ============================================================
/*
  SUPABASE_URL          = https://xxxxx.supabase.co
  SUPABASE_SERVICE_KEY  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (service_role)
  SUPABASE_ANON_KEY     = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (anon/public)
  JWT_SECRET            = uma-string-muito-longa-e-aleatoria-aqui-64-chars
  VAPID_PUBLIC_KEY      = (gerado pela função /api/gerar-vapid)
  VAPID_PRIVATE_KEY     = (gerado pela função /api/gerar-vapid)
  VAPID_EMAIL           = mailto:seuemail@gmail.com
  ADMIN_MASTER_NICK     = GoddoY
  ADMIN_MASTER_PIN      = 0000
*/
