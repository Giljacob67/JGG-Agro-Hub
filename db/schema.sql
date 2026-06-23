-- Schema PostgreSQL — JGG Agro Hub (futuro)
-- Isolado do ecossistema tributário

CREATE SCHEMA IF NOT EXISTS agro;

CREATE TYPE agro.lead_status AS ENUM (
  'novo', 'qualificando', 'qualificado', 'descartado'
);

-- Migração futura: ALTER TYPE ... ADD VALUE para ambientes com enum legado 'proposta'
CREATE TYPE agro.opportunity_stage AS ENUM (
  'novo_contato',
  'diagnostico_agendado',
  'diagnostico_realizado',
  'proposta_elaboracao',
  'proposta_enviada',
  'negociacao',
  'contrato',
  'perdido',
  'arquivado'
);

CREATE TYPE agro.matter_status AS ENUM (
  'aberta', 'em_andamento', 'aguardando', 'concluida'
);

CREATE TYPE agro.risk_level AS ENUM ('baixo', 'medio', 'alto', 'critico');

CREATE TYPE agro.task_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');

CREATE TYPE agro.task_status AS ENUM (
  'pendente', 'em_andamento', 'concluida', 'atrasada'
);

CREATE TYPE agro.account_type AS ENUM (
  'produtor', 'familia', 'cooperativa', 'agroindustria', 'trading', 'investidor'
);

CREATE TYPE agro.user_role AS ENUM ('gestao', 'comercial', 'juridico');

CREATE TYPE agro.lead_priority AS ENUM ('baixa', 'media', 'alta');

CREATE TYPE agro.matter_urgency AS ENUM ('normal', 'alta', 'critica');

CREATE TYPE agro.relationship_status AS ENUM (
  'ativo', 'em_expansao', 'em_risco', 'inativo'
);

CREATE TABLE agro.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role agro.user_role NOT NULL DEFAULT 'comercial',
  password_hash TEXT,
  salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type agro.account_type NOT NULL,
  region TEXT NOT NULL,
  area_ha NUMERIC(12, 2) DEFAULT 0,
  main_crop TEXT,
  owner TEXT NOT NULL,
  since TEXT,
  properties JSONB DEFAULT '[]'::jsonb,
  contacts JSONB DEFAULT '[]'::jsonb,
  contracted_areas JSONB DEFAULT '[]'::jsonb,
  mapped_risks JSONB DEFAULT '[]'::jsonb,
  relationship_status agro.relationship_status,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  region TEXT NOT NULL,
  crop TEXT,
  source TEXT,
  status agro.lead_status NOT NULL DEFAULT 'novo',
  owner TEXT NOT NULL,
  account_id TEXT REFERENCES agro.accounts(id) ON DELETE SET NULL,
  next_contact DATE,
  notes TEXT,
  lead_type TEXT,
  legal_pain TEXT,
  interest_area TEXT,
  priority agro.lead_priority,
  converted_opportunity_id TEXT,
  deleted_at TIMESTAMPTZ,
  created_at DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  account_id TEXT REFERENCES agro.accounts(id) ON DELETE SET NULL,
  account_name TEXT NOT NULL,
  stage agro.opportunity_stage NOT NULL,
  value_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  owner TEXT NOT NULL,
  expected_close DATE,
  next_contact DATE,
  priority TEXT NOT NULL DEFAULT 'normal',
  practice TEXT,
  probability SMALLINT CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100)),
  next_step TEXT,
  lead_id TEXT REFERENCES agro.leads(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.matters (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  account_id TEXT REFERENCES agro.accounts(id) ON DELETE SET NULL,
  account_name TEXT NOT NULL,
  practice TEXT NOT NULL,
  status agro.matter_status NOT NULL DEFAULT 'aberta',
  risk agro.risk_level NOT NULL DEFAULT 'medio',
  deadline DATE NOT NULL,
  owner TEXT NOT NULL,
  description TEXT,
  urgency agro.matter_urgency,
  pending_documents JSONB DEFAULT '[]'::jsonb,
  next_steps TEXT,
  cnj_number TEXT,
  court TEXT,
  phase TEXT CHECK (
    phase IN (
      'consultivo',
      'extrajudicial',
      'conhecimento',
      'recursal',
      'execucao',
      'cumprimento_sentenca'
    )
  ),
  opposing_party TEXT,
  claim_value_brl NUMERIC(14, 2),
  opportunity_id TEXT REFERENCES agro.opportunities(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.deadlines (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL REFERENCES agro.matters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fatal', 'ordinatorio')),
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'cumprido', 'cancelado')),
  due_date DATE NOT NULL,
  owner TEXT NOT NULL,
  completed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.activities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('lead', 'account', 'opportunity', 'matter')),
  entity_id TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('ligacao','reuniao','email','whatsapp','visita','nota','sistema')),
  summary TEXT NOT NULL,
  date DATE NOT NULL,
  owner TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT,
  actor_email TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  before_state JSONB,
  after_state JSONB,
  changes JSONB DEFAULT '[]'::jsonb,
  ip TEXT,
  prev_hash TEXT,
  hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  related_to TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comercial', 'juridica', 'operacional')),
  priority agro.task_priority NOT NULL DEFAULT 'media',
  status agro.task_status NOT NULL DEFAULT 'pendente',
  due_date DATE NOT NULL,
  owner TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_account ON agro.leads(account_id);
CREATE INDEX idx_opportunities_account ON agro.opportunities(account_id);
CREATE INDEX idx_matters_account ON agro.matters(account_id);
CREATE INDEX idx_tasks_related ON agro.tasks(related_to);
CREATE INDEX idx_matters_deadline ON agro.matters(deadline);
CREATE INDEX idx_tasks_due ON agro.tasks(due_date);
CREATE INDEX idx_deadlines_matter ON agro.deadlines(matter_id);
CREATE INDEX idx_deadlines_due ON agro.deadlines(due_date) WHERE status = 'pendente';
CREATE INDEX idx_activities_entity ON agro.activities(entity_id, date DESC);
CREATE INDEX idx_matters_opportunity ON agro.matters(opportunity_id);
CREATE INDEX idx_opportunities_lead ON agro.opportunities(lead_id);
CREATE INDEX idx_audit_logs_entity ON agro.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON agro.audit_logs(actor_email, created_at DESC);
CREATE INDEX idx_leads_active ON agro.leads(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_active ON agro.accounts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_active ON agro.opportunities(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_matters_active ON agro.matters(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_active ON agro.tasks(deleted_at) WHERE deleted_at IS NULL;

-- E-6 — pgvector: embeddings persistentes do Copilot RAG (1536 = text-embedding-3-small)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE agro.kb_embeddings (
  doc_id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  text TEXT NOT NULL,
  title TEXT,
  category_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_embeddings_vector
  ON agro.kb_embeddings USING hnsw (embedding vector_cosine_ops);

-- Configuração de runtime (key→value JSONB)
CREATE TABLE agro.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documentos da base de conhecimento (CRUD gerenciável; categorias estáticas)
CREATE TABLE agro.kb_documents (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  body TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kb_documents_category ON agro.kb_documents (category_id);
