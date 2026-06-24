export type LeadStatus = "novo" | "qualificando" | "qualificado" | "descartado";
export type LeadPriority = "baixa" | "media" | "alta";
export type OpportunityStage =
  | "novo_contato"
  | "diagnostico_agendado"
  | "diagnostico_realizado"
  | "proposta_elaboracao"
  | "proposta_enviada"
  | "negociacao"
  | "contrato"
  | "perdido"
  | "arquivado";
export type MatterStatus = "aberta" | "em_andamento" | "aguardando" | "concluida";
export type MatterUrgency = "normal" | "alta" | "critica";
export type RiskLevel = "baixo" | "medio" | "alto" | "critico";
export type TaskPriority = "baixa" | "media" | "alta" | "urgente";
export type TaskStatus = "pendente" | "em_andamento" | "concluida" | "atrasada";
export type AccountType =
  | "produtor"
  | "familia"
  | "cooperativa"
  | "agroindustria"
  | "trading"
  | "investidor";
export type RelationshipStatus =
  | "ativo"
  | "em_expansao"
  | "em_risco"
  | "inativo";
export type OpportunityPriority = "normal" | "alta";
export type AgroRole = "gestao" | "comercial" | "juridico";

/** Fase processual da demanda jurídica. */
export type MatterPhase =
  | "consultivo"
  | "extrajudicial"
  | "conhecimento"
  | "recursal"
  | "execucao"
  | "cumprimento_sentenca";

/** Prazo processual — fatal não admite prorrogação. */
export type DeadlineType = "fatal" | "ordinatorio";
export type DeadlineStatus = "pendente" | "cumprido" | "cancelado";

/** Interação registrada na timeline de qualquer entidade do CRM. */
export type ActivityEntityType = "lead" | "account" | "opportunity" | "matter";
export type ActivityType =
  | "ligacao"
  | "reuniao"
  | "email"
  | "whatsapp"
  | "visita"
  | "nota"
  | "sistema";

export interface Lead {
  id: string;
  name: string;
  contact: string;
  region: string;
  crop: string;
  source: string;
  status: LeadStatus;
  owner: string;
  createdAt: string;
  nextContact: string | null;
  notes: string;
  accountId?: string | null;
  leadType?: string;
  legalPain?: string;
  interestArea?: string;
  priority?: LeadPriority;
  /** Oportunidade gerada na conversão deste lead. */
  convertedOpportunityId?: string | null;
  phone?: string;
  email?: string;
  cnpj?: string;
  cpf?: string;
  address?: string;
  /** Lista de prospecção a que o lead pertence (frente de trabalho). */
  listId?: string | null;
  deletedAt?: string | null;
}

export interface LeadList {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  createdAt: string;
  /** Quantidade de leads ativos vinculados. Derivado, não persistido. */
  leadCount?: number;
  deletedAt?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  region: string;
  areaHa: number;
  mainCrop: string;
  owner: string;
  activeMatters: number;
  activeOpportunities: number;
  since: string;
  properties?: string[];
  contacts?: string[];
  contractedAreas?: string[];
  mappedRisks?: string[];
  relationshipStatus?: RelationshipStatus;
  cnpj?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: string;
  deletedAt?: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  accountName: string;
  accountId?: string;
  stage: OpportunityStage;
  valueBrl: number;
  owner: string;
  expectedClose: string;
  nextContact: string | null;
  priority: OpportunityPriority;
  practice: string;
  probability?: number;
  nextStep?: string;
  /** Lead que originou esta oportunidade (rastreabilidade de origem). */
  leadId?: string | null;
  description?: string;
  deletedAt?: string | null;
}

export interface Matter {
  id: string;
  title: string;
  accountName: string;
  accountId?: string;
  practice: string;
  status: MatterStatus;
  risk: RiskLevel;
  deadline: string;
  owner: string;
  description: string;
  urgency?: MatterUrgency;
  pendingDocuments?: string[];
  nextSteps?: string;
  /** Identidade processual */
  cnjNumber?: string;
  court?: string;
  phase?: MatterPhase;
  opposingParty?: string;
  claimValueBrl?: number;
  /** Oportunidade comercial que originou (ou está ligada a) esta demanda. */
  opportunityId?: string | null;
  clientLawyer?: string;
  opposingLawyer?: string;
  nextHearingDate?: string | null;
  jurisdiction?: "federal" | "estadual" | "trabalhista" | "arbitral";
  /** Vinculação entre demandas (ex: apelação → instância original) */
  parentMatterId?: string | null;
  /** Tipo de vínculo: apelacao, recurso, execucao, incidente, etc. */
  relationType?: string;
  deletedAt?: string | null;
}

/** Prazo processual vinculado a uma demanda. Uma demanda tem N prazos. */
export interface Deadline {
  id: string;
  matterId: string;
  title: string;
  type: DeadlineType;
  status: DeadlineStatus;
  dueDate: string;
  owner: string;
  completedAt: string | null;
  notes?: string;
  reminderDays?: number;
  deletedAt?: string | null;
}

// ── Document Management ────────────────────────────────────────────

export type DocumentCategory =
  | "contrato"
  | "peticao"
  | "procuracao"
  | "comprovante"
  | "certidao"
  | "laudo"
  | "parecer"
  | "decisao"
  | "despacho"
  | "notificacao"
  | "outro";

export type DocumentStatus = "pendente" | "recebido" | "aprovado" | "rejeitado" | "arquivado";

export type DocumentEntityType = "matter" | "account" | "opportunity" | "lead";

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  entityType: DocumentEntityType;
  entityId: string;
  matterId?: string | null;
  description?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  version: number;
  versions: DocumentVersion[];
  tags?: string[];
  owner: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface DocumentVersion {
  version: number;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface DocumentChecklistItem {
  id: string;
  matterId: string;
  label: string;
  category: DocumentCategory;
  required: boolean;
  status: DocumentStatus;
  documentId?: string | null;
  notes?: string;
  createdAt: string;
}

// ── Time Tracking & Billing ────────────────────────────────────────

export type TimeEntryType = "horas" | "fixo" | "contingencia";

export interface TimeEntry {
  id: string;
  matterId: string;
  taskId?: string | null;
  description: string;
  hours: number;
  hourlyRate: number;
  totalBrl: number;
  type: TimeEntryType;
  date: string;
  owner: string;
  billable: boolean;
  invoiced: boolean;
  invoiceId?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Invoice {
  id: string;
  accountId: string;
  matterId?: string | null;
  number: string;
  status: "rascunho" | "emitida" | "paga" | "atrasada" | "cancelada";
  totalBrl: number;
  issuedAt: string;
  dueAt: string;
  paidAt?: string | null;
  notes?: string;
  timeEntryIds: string[];
  createdAt: string;
  deletedAt?: string | null;
}

export interface FeeAgreement {
  id: string;
  accountId: string;
  matterId?: string | null;
  type: "hora" | "fixo" | "percentual" | "contingencia";
  hourlyRate?: number;
  fixedValue?: number;
  percentage?: number;
  successFeePercentage?: number;
  capValue?: number;
  description: string;
  signedAt: string;
  expiresAt?: string | null;
  active: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

// ── Contact Entity ─────────────────────────────────────────────────

export type ContactRole = "proprietario" | "administrador" | "gerente" | "advogado" | "contador" | "parceiro" | "outro";

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  cpf?: string;
  role: ContactRole;
  department?: string;
  isPrimary: boolean;
  accountIds: string[];
  notes?: string;
  owner: string;
  createdAt: string;
  deletedAt?: string | null;
}

// ── Property / Rural Land ──────────────────────────────────────────

export type PropertyType = "propriedade" | "posse" | "area_de_interesse";

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  accountId: string;
  carNumber?: string;
  matricula?: string;
  areaHa: number;
  declaredAreaHa?: number;
  carAreaHa?: number;
  matriculaAreaHa?: number;
  location?: string;
  municipality?: string;
  state?: string;
  GPS?: string;
  mainCrop?: string;
  encumbrances?: string[];
  restrictions?: string[];
  notes?: string;
  owner: string;
  createdAt: string;
  deletedAt?: string | null;
}

// ── Opposing Party ─────────────────────────────────────────────────

export interface OpposingParty {
  id: string;
  name: string;
  cpf?: string;
  cnpj?: string;
  type: "pessoa_fisica" | "pessoa_juridica" | "orgao_publico";
  lawyer?: string;
  lawyerOab?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  matters: string[];
  createdAt: string;
  deletedAt?: string | null;
}

/** Reunião agendada no calendário (criada/excluída direto na tela). */
export interface Meeting {
  id: string;
  title: string;
  /** Data no formato YYYY-MM-DD. */
  date: string;
  /** Hora opcional no formato HH:MM. */
  time?: string | null;
  location?: string | null;
  description?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Interação (ligação, reunião, e-mail, WhatsApp…) vinculada a uma entidade. */
export interface Activity {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  type: ActivityType;
  summary: string;
  date: string;
  owner: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  relatedTo: string;
  type: "comercial" | "juridica" | "operacional";
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  owner: string;
  description?: string;
  estimatedHours?: number;
  actualHours?: number;
  deletedAt?: string | null;
}

export interface AgroUser {
  id: string;
  email: string;
  name: string;
  role: AgroRole;
  phone?: string;
  avatar?: string;
  barNumber?: string;
  department?: string;
  active?: boolean;
}

/** Usuário gerenciável na tela de configurações (gestão). */
export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: AgroRole;
  active: boolean;
  hasPassword: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PracticeBreakdown {
  practice: string;
  matters: number;
  opportunities: number;
  pipelineValue: number;
}

export interface RegionPortfolio {
  region: string;
  accounts: number;
  pipelineValue: number;
}

export type { PaginatedResult } from "./list-types.js";

export interface CrmStats {
  activeLeads: number;
  activeAccounts: number;
  openOpportunities: number;
  pipelineValue: number;
  closedValue: number;
  activeMatters: number;
  overdueTasks: number;
  upcomingTasks: number;
  qualifiedLeads: number;
  pipelineByStage: Array<{
    id: OpportunityStage;
    label: string;
    count: number;
    value: number;
  }>;
  practiceBreakdown: PracticeBreakdown[];
  portfolioByRegion: RegionPortfolio[];
  priorityOpportunities: Opportunity[];
  riskAlerts: Matter[];
  upcomingMatters: Matter[];
  upcomingContacts: Array<{
    id: string;
    entityType: "lead" | "oportunidade";
    name: string;
    accountOrLead: string;
    date: string;
    owner: string;
    channel: string;
  }>;
  overdueTasksList: Task[];
  upcomingTasksList: Task[];
}

/** Base de Conhecimento Agro */
export type KnowledgeDocType =
  | "guia"
  | "checklist"
  | "nota_tecnica"
  | "modelo"
  | "faq";

export type KnowledgeDocStatus = "publicado" | "rascunho" | "em_revisao";

export interface KnowledgeCategory {
  id: string;
  label: string;
  description: string;
}

export interface KnowledgeDocument {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: string;
  type: KnowledgeDocType;
  status: KnowledgeDocStatus;
  /** Corpo completo (texto extraído de arquivo anexado), indexado pela busca semântica. */
  body?: string;
  /** URL pública do arquivo anexado (R2). */
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

/** Agro Copilot */
export type CopilotEntityType = "conta" | "oportunidade" | "demanda" | "lead";

export interface CopilotContextEntity {
  type: CopilotEntityType;
  id: string;
  name: string;
}

export interface CopilotPrompt {
  id: string;
  label: string;
  text: string;
}

export interface CopilotSource {
  id: string;
  documentId: string;
  title: string;
  excerpt: string;
  categoryLabel: string;
}

export interface CopilotRelatedEntity {
  id: string;
  type: CopilotEntityType;
  name: string;
}

export interface CopilotResponse {
  id: string;
  promptId: string | null;
  query: string;
  synthesis: string;
  risks: string[];
  nextSteps: string[];
  sources: CopilotSource[];
  relatedEntities: CopilotRelatedEntity[];
  /** true = keyword engine mock, false = LLM-generated */
  simulated: boolean;
  disclaimer: string;
  generatedAt: string;
}

export interface CopilotQueryRequest {
  query: string;
  contextEntity?: CopilotContextEntity | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export type LlmProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "ollama"
  | "groq"
  | "openrouter";

export interface CopilotConfigStatus {
  providers: Array<{
    id: LlmProviderId;
    label: string;
    /** true = credencial presente no servidor (env) */
    available: boolean;
  }>;
  current: {
    provider: LlmProviderId;
    model: string;
    temperature?: number;
  } | null;
  /** origem da config efetiva */
  source: "db" | "env" | "none";
  dbEnabled: boolean;
  embeddings: { modelId: string; available: boolean };
}

export interface KnowledgeDocumentInput {
  categoryId: string;
  title: string;
  summary: string;
  tags: string[];
  type: KnowledgeDocType;
  status: KnowledgeDocStatus;
  body?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface KnowledgeListResponse {
  categories: KnowledgeCategory[];
  documents: KnowledgeDocument[];
}