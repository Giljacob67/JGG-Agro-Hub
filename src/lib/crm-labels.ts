import type {
  LeadStatus,
  MatterStatus,
  OpportunityStage,
  RiskLevel,
  TaskPriority,
  TaskStatus,
  AccountType,
} from "./crm-types";
import type { BadgeProps } from "@/components/ui/badge";

export const LEAD_STATUS: Record<LeadStatus, string> = {
  novo: "Novo",
  qualificando: "Qualificando",
  qualificado: "Qualificado",
  descartado: "Descartado",
};

export const OPPORTUNITY_STAGE: Record<OpportunityStage, string> = {
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  contrato: "Contrato",
  perdido: "Perdido",
};

export const MATTER_STATUS: Record<MatterStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  concluida: "Concluída",
};

export const RISK_LEVEL: Record<RiskLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

export const TASK_PRIORITY: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const TASK_STATUS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
};

export const ACCOUNT_TYPE: Record<AccountType, string> = {
  produtor: "Produtor",
  familia: "Família empresária",
  cooperativa: "Cooperativa",
  agroindustria: "Agroindústria",
  trading: "Trading",
  investidor: "Investidor",
};

export function riskBadgeVariant(risk: RiskLevel): BadgeProps["variant"] {
  if (risk === "critico") return "danger";
  if (risk === "alto") return "warning";
  if (risk === "medio") return "secondary";
  return "muted";
}

export function taskBadgeVariant(status: TaskStatus): BadgeProps["variant"] {
  if (status === "atrasada") return "danger";
  if (status === "concluida") return "success";
  return "outline";
}

export function priorityBadgeVariant(
  priority: TaskPriority,
): BadgeProps["variant"] {
  if (priority === "urgente") return "danger";
  if (priority === "alta") return "warning";
  return "outline";
}

export function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
}

export function isOverdue(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date + "T12:00:00") < today;
}