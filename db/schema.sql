-- Schema PostgreSQL — JGG Agro Hub (futuro)
-- Isolado do ecossistema tributário

CREATE SCHEMA IF NOT EXISTS agro;

CREATE TYPE agro.lead_status AS ENUM (
  'novo', 'qualificando', 'qualificado', 'descartado'
);

CREATE TYPE agro.opportunity_stage AS ENUM (
  'qualificacao', 'proposta', 'negociacao', 'contrato', 'perdido'
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

CREATE TABLE agro.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role agro.user_role NOT NULL DEFAULT 'comercial',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agro.accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type agro.account_type NOT NULL,
  region TEXT NOT NULL,
  area_ha NUMERIC(12, 2) DEFAULT 0,
  main_crop TEXT,
  owner TEXT NOT NULL,
  since DATE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_account ON agro.leads(account_id);
CREATE INDEX idx_opportunities_account ON agro.opportunities(account_id);
CREATE INDEX idx_matters_account ON agro.matters(account_id);
CREATE INDEX idx_tasks_related ON agro.tasks(related_to);
CREATE INDEX idx_matters_deadline ON agro.matters(deadline);
CREATE INDEX idx_tasks_due ON agro.tasks(due_date);