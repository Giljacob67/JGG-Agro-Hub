import type { NeonQueryFunction } from "@neondatabase/serverless";
import { getSql } from "./client.js";

export async function runMigrations(
  sql: NeonQueryFunction<false, false> = getSql(),
) {
  await sql`CREATE SCHEMA IF NOT EXISTS agro`;

  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.lead_status AS ENUM ('novo','qualificando','qualificado','descartado');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.opportunity_stage AS ENUM ('novo_contato','diagnostico_agendado','diagnostico_realizado','proposta_elaboracao','proposta_enviada','negociacao','contrato','perdido','arquivado');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.matter_status AS ENUM ('aberta','em_andamento','aguardando','concluida');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.risk_level AS ENUM ('baixo','medio','alto','critico');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.task_priority AS ENUM ('baixa','media','alta','urgente');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.task_status AS ENUM ('pendente','em_andamento','concluida','atrasada');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.account_type AS ENUM ('produtor','familia','cooperativa','agroindustria','trading','investidor');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type agro.account_type NOT NULL,
      region TEXT NOT NULL,
      area_ha NUMERIC(12, 2) DEFAULT 0,
      main_crop TEXT,
      owner TEXT NOT NULL,
      since TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.leads (
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.opportunities (
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.matters (
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.tasks (
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
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_leads_account ON agro.leads(account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_opportunities_account ON agro.opportunities(account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_matters_account ON agro.matters(account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_related ON agro.tasks(related_to)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_matters_deadline ON agro.matters(deadline)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_due ON agro.tasks(due_date)`;

  await runEnrichedFieldMigrations(sql);
  await runSoftDeleteMigrations(sql);
}

async function runEnrichedFieldMigrations(
  sql: NeonQueryFunction<false, false>,
) {
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.lead_priority AS ENUM ('baixa','media','alta');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.matter_urgency AS ENUM ('normal','alta','critica');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.relationship_status AS ENUM ('ativo','em_expansao','em_risco','inativo');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;

  await sql`
    DO $$ BEGIN ALTER TYPE agro.opportunity_stage ADD VALUE IF NOT EXISTS 'novo_contato';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN ALTER TYPE agro.opportunity_stage ADD VALUE IF NOT EXISTS 'diagnostico_agendado';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN ALTER TYPE agro.opportunity_stage ADD VALUE IF NOT EXISTS 'diagnostico_realizado';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN ALTER TYPE agro.opportunity_stage ADD VALUE IF NOT EXISTS 'proposta_elaboracao';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN ALTER TYPE agro.opportunity_stage ADD VALUE IF NOT EXISTS 'proposta_enviada';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN ALTER TYPE agro.opportunity_stage ADD VALUE IF NOT EXISTS 'arquivado';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;

  await sql`ALTER TABLE agro.accounts ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE agro.accounts ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE agro.accounts ADD COLUMN IF NOT EXISTS contracted_areas JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE agro.accounts ADD COLUMN IF NOT EXISTS mapped_risks JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE agro.accounts ADD COLUMN IF NOT EXISTS relationship_status agro.relationship_status`;

  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS lead_type TEXT`;
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS legal_pain TEXT`;
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS interest_area TEXT`;
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS priority agro.lead_priority`;

  await sql`ALTER TABLE agro.opportunities ADD COLUMN IF NOT EXISTS probability SMALLINT`;
  await sql`ALTER TABLE agro.opportunities ADD COLUMN IF NOT EXISTS next_step TEXT`;

  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS urgency agro.matter_urgency`;
  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS pending_documents JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS next_steps TEXT`;

  await sql`
    UPDATE agro.opportunities
    SET stage = 'proposta_elaboracao'
    WHERE stage::text = 'proposta'
  `;
  await sql`
    UPDATE agro.opportunities
    SET stage = 'diagnostico_agendado'
    WHERE stage::text = 'qualificacao'
  `;

  await runPhase1Migrations(sql);
}

/**
 * Fase 1 — fundação de dados: identidade processual da demanda, prazos
 * processuais (N por demanda), timeline de interações e vínculos
 * lead→oportunidade / oportunidade↔demanda.
 */
async function runPhase1Migrations(sql: NeonQueryFunction<false, false>) {
  // Identidade processual da demanda
  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS cnj_number TEXT`;
  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS court TEXT`;
  await sql`
    ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS phase TEXT
    CHECK (phase IN ('consultivo','extrajudicial','conhecimento','recursal','execucao','cumprimento_sentenca'))
  `;
  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS opposing_party TEXT`;
  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS claim_value_brl NUMERIC(14, 2)`;

  // Vínculos de rastreabilidade
  await sql`
    ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS opportunity_id TEXT
    REFERENCES agro.opportunities(id) ON DELETE SET NULL
  `;
  await sql`
    ALTER TABLE agro.opportunities ADD COLUMN IF NOT EXISTS lead_id TEXT
    REFERENCES agro.leads(id) ON DELETE SET NULL
  `;
  await sql`
    ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS converted_opportunity_id TEXT
  `;

  // Prazos processuais — múltiplos por demanda
  await sql`
    CREATE TABLE IF NOT EXISTS agro.deadlines (
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
    )
  `;

  // Timeline de interações — qualquer entidade do CRM
  await sql`
    CREATE TABLE IF NOT EXISTS agro.activities (
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
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_deadlines_matter ON agro.deadlines(matter_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deadlines_due ON agro.deadlines(due_date) WHERE status = 'pendente'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_activities_entity ON agro.activities(entity_id, date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_matters_opportunity ON agro.matters(opportunity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_opportunities_lead ON agro.opportunities(lead_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_id TEXT,
      actor_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON agro.audit_logs(entity_type, entity_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON agro.audit_logs(actor_email, created_at DESC)`;
}

/**
 * Soft-delete (exclusão lógica) — entidades core do CRM.
 * Coluna nullable sem default → adição não-travante no Neon.
 */
async function runSoftDeleteMigrations(sql: NeonQueryFunction<false, false>) {
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE agro.accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE agro.opportunities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE agro.matters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE agro.tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;

  await sql`CREATE INDEX IF NOT EXISTS idx_leads_active ON agro.leads(deleted_at) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_accounts_active ON agro.accounts(deleted_at) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_opportunities_active ON agro.opportunities(deleted_at) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_matters_active ON agro.matters(deleted_at) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_active ON agro.tasks(deleted_at) WHERE deleted_at IS NULL`;
}
