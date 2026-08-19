-- ============================================================
-- OneCheck RP - Sistema de Chat por Facção
-- Banco de Dados: Supabase (PostgreSQL)
-- Versão: 1.0.0
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: faccoes
-- ============================================================
CREATE TABLE IF NOT EXISTS faccoes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        VARCHAR(60)  NOT NULL UNIQUE,
    tag         VARCHAR(10)  NOT NULL,
    descricao   TEXT,
    cor         VARCHAR(7)   NOT NULL DEFAULT '#3b82f6',
    icone       VARCHAR(10)  NOT NULL DEFAULT '🏴',
    senha_hash  VARCHAR(255),
    membros_count INTEGER DEFAULT 0,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- TABELA: membros
-- ============================================================
CREATE TABLE IF NOT EXISTS membros (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faccao_id   UUID NOT NULL REFERENCES faccoes(id) ON DELETE CASCADE,
    apelido     VARCHAR(60)  NOT NULL,
    cargo       VARCHAR(30)  NOT NULL DEFAULT 'Membro',
    cargo_rank  INTEGER NOT NULL DEFAULT 1, -- 1=Membro, 5=Líder
    online      BOOLEAN NOT NULL DEFAULT FALSE,
    ultimo_acesso TIMESTAMPTZ DEFAULT NOW(),
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membros_apelido_faccao
    ON membros(faccao_id, apelido);

-- ============================================================
-- TABELA: mensagens
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faccao_id   UUID NOT NULL REFERENCES faccoes(id) ON DELETE CASCADE,
    membro_id   UUID REFERENCES membros(id) ON DELETE SET NULL,
    apelido     VARCHAR(60)  NOT NULL,
    cargo       VARCHAR(30)  NOT NULL DEFAULT 'Membro',
    conteudo    TEXT,
    tipo        VARCHAR(20)  NOT NULL DEFAULT 'texto',
    -- tipo: 'texto' | 'audio' | 'sistema' | 'imagem'
    audio_url   TEXT,
    imagem_url  TEXT,
    editada     BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_faccao_criado
    ON mensagens(faccao_id, criado_em DESC);

-- ============================================================
-- TABELA: sessoes_voz
-- Controle de quem está no canal de voz
-- ============================================================
CREATE TABLE IF NOT EXISTS sessoes_voz (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faccao_id   UUID NOT NULL REFERENCES faccoes(id) ON DELETE CASCADE,
    membro_id   UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    apelido     VARCHAR(60)  NOT NULL,
    peer_id     VARCHAR(100),
    mutado      BOOLEAN NOT NULL DEFAULT FALSE,
    entrou_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_voz_membro
    ON sessoes_voz(membro_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE faccoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_voz ENABLE ROW LEVEL SECURITY;

-- Políticas: acesso público anônimo (apenas leitura/inserção controlada)
CREATE POLICY "faccoes_public_read"  ON faccoes     FOR SELECT USING (true);
CREATE POLICY "faccoes_public_insert" ON faccoes    FOR INSERT WITH CHECK (true);

CREATE POLICY "membros_public_read"  ON membros     FOR SELECT USING (true);
CREATE POLICY "membros_public_insert" ON membros    FOR INSERT WITH CHECK (true);
CREATE POLICY "membros_public_update" ON membros    FOR UPDATE USING (true);

CREATE POLICY "mensagens_public_read"   ON mensagens  FOR SELECT USING (true);
CREATE POLICY "mensagens_public_insert" ON mensagens  FOR INSERT WITH CHECK (true);

CREATE POLICY "voz_public_all" ON sessoes_voz FOR ALL USING (true);

-- ============================================================
-- REALTIME: habilitar tabelas para tempo real
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE sessoes_voz;
ALTER PUBLICATION supabase_realtime ADD TABLE membros;

-- ============================================================
-- STORAGE: bucket para áudios
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('audios-faccao', 'audios-faccao', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "audio_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'audios-faccao');

CREATE POLICY "audio_public_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'audios-faccao');

-- ============================================================
-- DADOS INICIAIS (facções exemplo)
-- ============================================================
INSERT INTO faccoes (nome, tag, descricao, cor, icone) VALUES
    ('Sem Facção', 'SEM', 'Canal geral para jogadores sem facção', '#64748b', '👤'),
    ('Staff do Servidor', 'STAFF', 'Canal exclusivo da administração', '#a855f7', '⭐')
ON CONFLICT DO NOTHING;
