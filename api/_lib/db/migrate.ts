import { neon } from "@neondatabase/serverless";
import { getSql } from "./client";

export async function runMigrations(
  sql: ReturnType<typeof neon> = getSql(),
) {
  await sql`CREATE SCHEMA IF NOT EXISTS agro`;

  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.lead_status AS ENUM ('novo','qualificando','qualificado','descartado');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.opportunity_stage AS ENUM ('qualificacao','proposta','negociacao','contrato','perdido');
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
}