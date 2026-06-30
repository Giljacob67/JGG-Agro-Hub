import type { NeonQueryFunction } from "@neondatabase/serverless";
import { getSql } from "./client.js";
import { KNOWLEDGE_DOCUMENTS } from "../../../shared/agro/knowledge.js";

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

  // E-11: identidade dos usuários em DB (senha continua env-driven por papel)
  await sql`
    DO $$ BEGIN
      CREATE TYPE agro.user_role AS ENUM ('gestao','comercial','juridico');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS agro.users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role agro.user_role NOT NULL DEFAULT 'comercial',
      password_hash TEXT,
      salt TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE agro.users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await sql`ALTER TABLE agro.users ADD COLUMN IF NOT EXISTS salt TEXT`;
  await sql`ALTER TABLE agro.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`;
  await sql`ALTER TABLE agro.users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true`;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      meeting_date DATE NOT NULL,
      meeting_time TEXT,
      location TEXT,
      description TEXT,
      created_by TEXT,
      created_by_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_meetings_date ON agro.meetings(meeting_date) WHERE deleted_at IS NULL`;

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
  await runPgvectorMigrations(sql);
  await runSecondaryEntityMigrations(sql);
  await runTertiaryEntityMigrations(sql);
  await runAppConfigMigrations(sql);
  await runKnowledgeMigrations(sql);
  await runLeadListMigrations(sql);
}

/**
 * Listas de leads — agrupamento de prospecção por frente de trabalho
 * (ex.: importação "Maringá"). `list_id` em agro.leads aponta para a lista;
 * ON DELETE SET NULL preserva os leads quando a lista é removida.
 */
async function runLeadListMigrations(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS agro.lead_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await sql`
    ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS list_id TEXT
    REFERENCES agro.lead_lists(id) ON DELETE SET NULL
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_list ON agro.leads(list_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_lead_lists_active ON agro.lead_lists(deleted_at) WHERE deleted_at IS NULL`;
}

/**
 * Documentos da base de conhecimento (antes hardcoded em
 * `shared/agro/knowledge.ts`). Persistir habilita gestão (CRUD) em runtime.
 * As categorias permanecem estáticas (taxonomia estrutural). Seed idempotente
 * a partir do array estático apenas quando a tabela está vazia — não
 * sobrescreve edições feitas via app. Embeddings (`agro.kb_embeddings`) são
 * regenerados sob demanda pelo RAG a partir desta tabela.
 */
async function runKnowledgeMigrations(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS agro.kb_documents (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_kb_documents_category ON agro.kb_documents (category_id)`;

  // Anexo de arquivo + corpo extraído (Nível 2: upload PDF/DOCX/MD → texto indexado).
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS body TEXT`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS file_url TEXT`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS file_name TEXT`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS file_size INTEGER`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS file_type TEXT`;

  // Metadados jurídicos (jurisprudência): tribunal, relator, julgamento, processo, ementa.
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS tribunal TEXT`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS relator TEXT`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS data_julgamento DATE`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS numero_processo TEXT`;
  await sql`ALTER TABLE agro.kb_documents ADD COLUMN IF NOT EXISTS ementa TEXT`;

  const countRows = (await sql`SELECT COUNT(*)::int AS n FROM agro.kb_documents`) as Array<{ n: number }>;
  if (countRows[0]?.n > 0) return;

  console.log(`[migrate] semeando ${KNOWLEDGE_DOCUMENTS.length} documentos KB…`);
  for (const doc of KNOWLEDGE_DOCUMENTS) {
    await sql`
      INSERT INTO agro.kb_documents (id, category_id, title, summary, tags, type, status, updated_at)
      VALUES (
        ${doc.id}, ${doc.categoryId}, ${doc.title}, ${doc.summary},
        ${JSON.stringify(doc.tags)}::jsonb, ${doc.type}, ${doc.status}, ${doc.updatedAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

/**
 * Configuração de runtime da aplicação (key→value JSONB). Usada para
 * sobrescrever, em produção, defaults vindos de env — ex.: provider/model
 * do Copilot. Chaves de API NUNCA são persistidas aqui (continuam em env);
 * só seleção de provider/model/temperature entre os já habilitados.
 */
async function runAppConfigMigrations(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS agro.app_config (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

/**
 * Fase 2/3 da migração das entidades secundárias (antes só em memória):
 * checklist de documentos, apontamentos de horas, contratos de honorários,
 * partes contrárias, safras, obrigações tributárias, licenças ambientais e
 * instrumentos de crédito rural. Datas que o validator pode emitir como
 * string vazia vão como TEXT (evita erro 22007 em coluna DATE); arrays vão
 * como JSONB; soft-delete via `deleted_at` onde o tipo o define. Mantém em
 * sincronia com `DB_BACKED_RESOURCES` em `api/_lib/guard.ts`.
 */
async function runTertiaryEntityMigrations(
  sql: NeonQueryFunction<false, false>,
) {
  // Checklist de documentos por demanda (hard-delete, sem deleted_at)
  await sql`
    CREATE TABLE IF NOT EXISTS agro.document_checklist (
      id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      required BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'pendente',
      document_id TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Apontamento de horas (soft-delete)
  await sql`
    CREATE TABLE IF NOT EXISTS agro.time_entries (
      id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      task_id TEXT,
      description TEXT NOT NULL,
      hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
      hourly_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'horas',
      date DATE NOT NULL,
      owner TEXT NOT NULL,
      billable BOOLEAN NOT NULL DEFAULT true,
      invoiced BOOLEAN NOT NULL DEFAULT false,
      invoice_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;

  // Contratos de honorários (soft-delete)
  await sql`
    CREATE TABLE IF NOT EXISTS agro.fee_agreements (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      matter_id TEXT,
      type TEXT NOT NULL DEFAULT 'hora',
      hourly_rate NUMERIC(12, 2),
      fixed_value NUMERIC(14, 2),
      percentage NUMERIC(6, 3),
      success_fee_percentage NUMERIC(6, 3),
      cap_value NUMERIC(14, 2),
      description TEXT NOT NULL DEFAULT '',
      signed_at TEXT NOT NULL DEFAULT '',
      expires_at TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;

  // Partes contrárias (soft-delete, matters JSONB)
  await sql`
    CREATE TABLE IF NOT EXISTS agro.opposing_parties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cpf TEXT,
      cnpj TEXT,
      type TEXT NOT NULL DEFAULT 'pessoa_fisica',
      lawyer TEXT,
      lawyer_oab TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      matters JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_doc_checklist_matter ON agro.document_checklist(matter_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_matter ON agro.time_entries(matter_id) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_owner ON agro.time_entries(owner) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fee_agreements_account ON agro.fee_agreements(account_id) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fee_agreements_matter ON agro.fee_agreements(matter_id) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_opposing_parties_active ON agro.opposing_parties(deleted_at) WHERE deleted_at IS NULL`;
}

/**
 * Fase 1 da migração das entidades secundárias (antes só em memória):
 * documentos, contatos, propriedades rurais e faturas. Arrays vão como
 * JSONB; soft-delete via `deleted_at`. Mantém em sincronia com
 * `DB_BACKED_RESOURCES` em `api/_lib/guard.ts`.
 */
async function runSecondaryEntityMigrations(
  sql: NeonQueryFunction<false, false>,
) {
  await sql`
    CREATE TABLE IF NOT EXISTS agro.documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      entity_type TEXT NOT NULL
        CHECK (entity_type IN ('matter', 'account', 'opportunity', 'lead')),
      entity_id TEXT NOT NULL,
      matter_id TEXT,
      description TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      versions JSONB NOT NULL DEFAULT '[]'::jsonb,
      tags JSONB DEFAULT '[]'::jsonb,
      owner TEXT NOT NULL,
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      whatsapp TEXT,
      cpf TEXT,
      role TEXT NOT NULL,
      department TEXT,
      is_primary BOOLEAN NOT NULL DEFAULT false,
      account_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      owner TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.properties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      account_id TEXT NOT NULL,
      car_number TEXT,
      matricula TEXT,
      area_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
      declared_area_ha NUMERIC(12, 2),
      car_area_ha NUMERIC(12, 2),
      matricula_area_ha NUMERIC(12, 2),
      location TEXT,
      municipality TEXT,
      state TEXT,
      gps TEXT,
      main_crop TEXT,
      encumbrances JSONB DEFAULT '[]'::jsonb,
      restrictions JSONB DEFAULT '[]'::jsonb,
      notes TEXT,
      owner TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agro.invoices (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      matter_id TEXT,
      number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'rascunho',
      total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
      issued_at DATE NOT NULL,
      due_at DATE NOT NULL,
      paid_at DATE,
      notes TEXT,
      time_entry_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_documents_entity ON agro.documents(entity_id) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_documents_matter ON agro.documents(matter_id) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_contacts_active ON agro.contacts(deleted_at) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_contacts_accounts ON agro.contacts USING gin (account_ids)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_properties_account ON agro.properties(account_id) WHERE deleted_at IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_account ON agro.invoices(account_id) WHERE deleted_at IS NULL`;
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
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS phone TEXT`;
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS cnpj TEXT`;
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS cpf TEXT`;
  await sql`ALTER TABLE agro.leads ADD COLUMN IF NOT EXISTS address TEXT`;

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

  // E-2: antes/depois/diff/IP/chain hash na auditoria
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS entity_name TEXT`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS before_state JSONB`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS after_state JSONB`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS changes JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS ip TEXT`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS prev_hash TEXT`;
  await sql`ALTER TABLE agro.audit_logs ADD COLUMN IF NOT EXISTS hash TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON agro.audit_logs(action, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON agro.audit_logs(created_at DESC)`;
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

/**
 * E-6 — pgvector: embeddings persistentes para o Copilot RAG.
 * Substitui o cache efêmero module-level (perdido a cada cold start e
 * regenerado com chamadas pagas). Vetor de dimensão 1536 (compatível com
 * text-embedding-3-small); trocar de modelo exige reseed (db:reseed-kb).
 */
async function runPgvectorMigrations(sql: NeonQueryFunction<false, false>) {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`
    CREATE TABLE IF NOT EXISTS agro.kb_embeddings (
      doc_id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      embedding vector(1536) NOT NULL,
      text TEXT NOT NULL,
      title TEXT,
      category_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_kb_embeddings_vector ON agro.kb_embeddings USING hnsw (embedding vector_cosine_ops)`;
}
