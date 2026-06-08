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
}

export interface AgroUser {
  id: string;
  email: string;
  name: string;
  role: AgroRole;
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
  simulated: true;
  disclaimer: string;
  generatedAt: string;
}

export interface CopilotQueryRequest {
  query: string;
  contextEntity?: CopilotContextEntity | null;
}

export interface KnowledgeListResponse {
  categories: KnowledgeCategory[];
  documents: KnowledgeDocument[];
}