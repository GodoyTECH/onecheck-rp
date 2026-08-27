-- ============================================================
--  GoddoY RK — Schema PostgreSQL para Neon
--  Execute no SQL Editor do Neon (console.neon.tech)
--  ou via Netlify → Integrations → Neon → Open in Neon
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
--  MEMBROS
-- ============================================================
CREATE TABLE IF NOT EXISTS membros (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nick            VARCHAR(50) NOT NULL UNIQUE,
    pin_hash        TEXT        NOT NULL,
    cargo           VARCHAR(20) NOT NULL DEFAULT 'Recruta'
                    CHECK (cargo IN ('Recruta','Membro','Veterano','Oficial','Tenente','Gerente','Lider')),
    nivel           INTEGER     NOT NULL DEFAULT 1  CHECK (nivel BETWEEN 1 AND 100),
    nivel_ak        INTEGER     NOT NULL DEFAULT 1  CHECK (nivel_ak BETWEEN 1 AND 50),
    pontos          INTEGER     NOT NULL DEFAULT 0  CHECK (pontos >= 0),
    avatar_url      TEXT,
    bio             VARCHAR(200),
    is_admin        BOOLEAN     NOT NULL DEFAULT false,
    is_ativo        BOOLEAN     NOT NULL DEFAULT true,
    nivel_notificado     INTEGER DEFAULT 1,
    nivel_ak_notificado  INTEGER DEFAULT 1,
    ultimo_acesso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membros_nick   ON membros(LOWER(nick));
CREATE INDEX IF NOT EXISTS idx_membros_ativo  ON membros(is_ativo);
CREATE INDEX IF NOT EXISTS idx_membros_pontos ON membros(pontos DESC);


-- ============================================================
--  SESSÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS sessoes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID        NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,   -- md5 do JWT
    device_info TEXT,
    lembrar     BOOLEAN     NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_membro  ON sessoes(membro_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_expires ON sessoes(expires_at);


-- ============================================================
--  CONFIGURAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
    chave       VARCHAR(60) PRIMARY KEY,
    valor       TEXT        NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO config (chave, valor) VALUES
    ('temporada_atual',   '75'),
    ('temporada_inicio',  '2026-08-19'),
    ('temporada_fim',     '2026-09-01'),
    ('nome_gangue',       'GoddoY RK'),
    ('max_membros',       '45'),
    ('pvp_horario',       '20:00'),
    ('evento_horario',    '21:00'),
    ('pvp_dias',          '1,3,5'),
    ('evento_dias',       '0,6')
ON CONFLICT (chave) DO NOTHING;


-- ============================================================
--  PUSH SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID        NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    endpoint    TEXT        NOT NULL,
    p256dh      TEXT        NOT NULL,
    auth_key    TEXT        NOT NULL,
    device_label TEXT,
    ativo       BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (membro_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_membro ON push_subscriptions(membro_id);
CREATE INDEX IF NOT EXISTS idx_push_ativo  ON push_subscriptions(ativo);


-- ============================================================
--  NOTIFICAÇÕES INTERNAS
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id       UUID        REFERENCES membros(id) ON DELETE SET NULL,
    titulo          VARCHAR(200) NOT NULL,
    mensagem        TEXT        NOT NULL,
    tipo            VARCHAR(30) NOT NULL DEFAULT 'geral'
                    CHECK (tipo IN ('tarefa','evento','pvp','promocao','denuncia','nivel','ak','geral')),
    referencia_id   UUID,
    lida            BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_membro ON notificacoes(membro_id, lida);
CREATE INDEX IF NOT EXISTS idx_notif_ts     ON notificacoes(created_at DESC);


-- ============================================================
--  CHAT GERAL
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens_gerais (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID        REFERENCES membros(id) ON DELETE SET NULL,
    nick        VARCHAR(50) NOT NULL,
    cargo       VARCHAR(20) NOT NULL,
    tipo        VARCHAR(10) NOT NULL DEFAULT 'texto'
                CHECK (tipo IN ('texto','audio','sistema','imagem')),
    conteudo    TEXT        NOT NULL,
    media_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_ts ON mensagens_gerais(created_at DESC);


-- ============================================================
--  CONVERSAS PRIVADAS (DMs)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro1_id      UUID        NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    membro2_id      UUID        NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    ultima_msg      TEXT,
    ultima_msg_ts   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (membro1_id <> membro2_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_m1 ON conversas(membro1_id);
CREATE INDEX IF NOT EXISTS idx_conv_m2 ON conversas(membro2_id);

CREATE TABLE IF NOT EXISTS mensagens_dm (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id     UUID        NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
    remetente_id    UUID        NOT NULL REFERENCES membros(id) ON DELETE SET NULL,
    tipo            VARCHAR(10) NOT NULL DEFAULT 'texto'
                    CHECK (tipo IN ('texto','audio','imagem')),
    conteudo        TEXT        NOT NULL,
    media_url       TEXT,
    lida            BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversa ON mensagens_dm(conversa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_lida     ON mensagens_dm(conversa_id, lida);


-- ============================================================
--  FEED SOCIAL
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID        REFERENCES membros(id) ON DELETE SET NULL,
    nick        VARCHAR(50) NOT NULL,
    cargo       VARCHAR(20) NOT NULL,
    conteudo    TEXT,
    media_url   TEXT,
    media_tipo  VARCHAR(10) CHECK (media_tipo IN ('foto','video') OR media_tipo IS NULL),
    likes       INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_feed   ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_membro ON posts(membro_id);

CREATE TABLE IF NOT EXISTS post_likes (
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    membro_id   UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, membro_id)
);

CREATE TABLE IF NOT EXISTS comentarios (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    membro_id   UUID        REFERENCES membros(id) ON DELETE SET NULL,
    nick        VARCHAR(50) NOT NULL,
    conteudo    VARCHAR(500) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coments_post ON comentarios(post_id, created_at);


-- ============================================================
--  DENÚNCIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS denuncias (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    denunciante_id      UUID        REFERENCES membros(id) ON DELETE SET NULL,
    nick_denunciante    VARCHAR(50) NOT NULL,
    nick_denunciado     VARCHAR(50) NOT NULL,
    tipo_denuncia       VARCHAR(40) NOT NULL
                        CHECK (tipo_denuncia IN (
                            'dm_sem_motivo','rdm_na_rua','taser_veiculo',
                            'invasao_territorio','desrespeito_toxicidade',
                            'contra_integrante','outro')),
    descricao           TEXT        NOT NULL,
    evidencia_url       TEXT,
    evidencia_tipo      VARCHAR(5)  CHECK (evidencia_tipo IN ('foto','video') OR evidencia_tipo IS NULL),
    status              VARCHAR(20) NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','analisando','resolvido','arquivado')),
    admin_nota          TEXT,
    admin_id            UUID REFERENCES membros(id),
    resolvido_em        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_denuncia_status ON denuncias(status);
CREATE INDEX IF NOT EXISTS idx_denuncia_ts     ON denuncias(created_at DESC);


-- ============================================================
--  TAREFAS / MISSÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo      VARCHAR(100) NOT NULL,
    descricao   TEXT        NOT NULL,
    pontos      INTEGER     NOT NULL DEFAULT 500 CHECK (pontos >= 0),
    criado_por  UUID        REFERENCES membros(id) ON DELETE SET NULL,
    ativa       BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarefas_concluidas (
    tarefa_id   UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    membro_id   UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    concluida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tarefa_id, membro_id)
);


-- ============================================================
--  HISTÓRICO DE PONTUAÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS pontuacao_historico (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID        NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    nick        VARCHAR(50) NOT NULL,
    pontos      INTEGER     NOT NULL,
    motivo      VARCHAR(200) NOT NULL,
    admin_id    UUID        REFERENCES membros(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pts_membro ON pontuacao_historico(membro_id, created_at DESC);


-- ============================================================
--  HISTÓRICO DE PROMOÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS promocoes_historico (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id   UUID        NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    nick        VARCHAR(50) NOT NULL,
    cargo_ant   VARCHAR(20) NOT NULL,
    cargo_novo  VARCHAR(20) NOT NULL,
    motivo      VARCHAR(200) NOT NULL,
    admin_id    UUID        REFERENCES membros(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
--  CONQUISTAS DA TEMPORADA
-- ============================================================
CREATE TABLE IF NOT EXISTS conquistas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada       INTEGER     NOT NULL,
    tipo            VARCHAR(40) NOT NULL,
    nick_vencedor   VARCHAR(50),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (temporada, tipo)
);


-- ============================================================
--  TRIGGERS — atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER tg_membros_updated BEFORE UPDATE ON membros
    FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER tg_config_updated BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- Trigger: atualizar likes counter
CREATE OR REPLACE FUNCTION fn_likes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END; $$;

CREATE TRIGGER tg_post_likes
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION fn_likes();


-- ============================================================
--  VARIÁVEIS DE AMBIENTE NECESSÁRIAS NO NETLIFY
-- ============================================================
/*
  Adicione em: Netlify → Site → Environment variables

  1. DATABASE_URL      → Gerada automaticamente pela integração Neon no Netlify
                         (Netlify → Integrations → Neon → Connect)
                         Formato: postgresql://user:senha@ep-xxx.neon.tech/neondb?sslmode=require

  2. JWT_SECRET        → Qualquer string longa (ex: godoy-rk-jwt-secret-2025-XYZABC123)

  3. VAPID_PUBLIC_KEY  → Chave pública Web Push (gere em: https://vapidkeys.com)
  4. VAPID_PRIVATE_KEY → Chave privada Web Push
  5. VAPID_EMAIL       → mailto:seuemail@gmail.com

  6. ADMIN_MASTER_NICK → Seu nick (ex: GoddoY)
  7. ADMIN_MASTER_PIN  → PIN inicial do admin (ex: 1234 — troque após o 1º login)

  8. SITE_ID           → ID do site no Netlify (Netlify → Site → General → Site ID)
  9. NETLIFY_TOKEN     → Token de acesso (Netlify → User Settings → Applications → New access token)

  TOTAL: 9 variáveis (muito mais simples que Supabase!)

  A integração Neon no Netlify configura DATABASE_URL automaticamente.
  Acesse: app.netlify.com → seu site → Integrations → Database → Neon → Connect
*/
