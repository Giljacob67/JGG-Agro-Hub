export type LeadStatus = "novo" | "qualificando" | "qualificado" | "descartado";
export type OpportunityStage =
  | "qualificacao"
  | "proposta"
  | "negociacao"
  | "contrato"
  | "perdido";
export type MatterStatus = "aberta" | "em_andamento" | "aguardando" | "concluida";
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
  notes: string;
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
}

export interface Opportunity {
  id: string;
  title: string;
  accountName: string;
  stage: OpportunityStage;
  valueBrl: number;
  owner: string;
  expectedClose: string;
  practice: string;
}

export interface Matter {
  id: string;
  title: string;
  accountName: string;
  practice: string;
  status: MatterStatus;
  risk: RiskLevel;
  deadline: string;
  owner: string;
  description: string;
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