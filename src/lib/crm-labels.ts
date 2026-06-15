import type {
  ActivityType,
  DeadlineStatus,
  DeadlineType,
  LeadStatus,
  LeadPriority,
  MatterPhase,
  MatterStatus,
  MatterUrgency,
  OpportunityStage,
  RiskLevel,
  TaskPriority,
  TaskStatus,
  AccountType,
  RelationshipStatus,
} from "./crm-types";
import type { BadgeProps } from "@/components/ui/badge";

export const LEAD_STATUS: Record<LeadStatus, string> = {
  novo: "Novo",
  qualificando: "Qualificando",
  qualificado: "Qualificado",
  descartado: "Descartado",
};

export const LEAD_PRIORITY: Record<LeadPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const OPPORTUNITY_STAGE: Record<OpportunityStage, string> = {
  novo_contato: "Novo contato",
  diagnostico_agendado: "Diagnóstico agendado",
  diagnostico_realizado: "Diagnóstico realizado",
  proposta_elaboracao: "Proposta em elaboração",
  proposta_enviada: "Proposta enviada",
  negociacao: "Em negociação",
  contrato: "Contratado",
  perdido: "Perdido",
  arquivado: "Arquivado",
};

export const MATTER_STATUS: Record<MatterStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  concluida: "Concluída",
};

export const MATTER_URGENCY: Record<MatterUrgency, string> = {
  normal: "Normal",
  alta: "Alta",
  critica: "Crítica",
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

export const RELATIONSHIP_STATUS: Record<RelationshipStatus, string> = {
  ativo: "Ativo",
  em_expansao: "Em expansão",
  em_risco: "Em risco",
  inativo: "Inativo",
};

export const MATTER_PHASE: Record<MatterPhase, string> = {
  consultivo: "Consultivo",
  extrajudicial: "Extrajudicial",
  conhecimento: "Conhecimento",
  recursal: "Recursal",
  execucao: "Execução",
  cumprimento_sentenca: "Cumprimento de sentença",
};

export const DEADLINE_TYPE: Record<DeadlineType, string> = {
  fatal: "Fatal",
  ordinatorio: "Ordinatório",
};

export const DEADLINE_STATUS: Record<DeadlineStatus, string> = {
  pendente: "Pendente",
  cumprido: "Cumprido",
  cancelado: "Cancelado",
};

export const ACTIVITY_TYPE: Record<ActivityType, string> = {
  ligacao: "Ligação",
  reuniao: "Reunião",
  email: "E-mail",
  whatsapp: "WhatsApp",
  visita: "Visita",
  nota: "Nota",
  sistema: "Sistema",
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

export {
  isCriticalDeadline,
  isOverdue,
  isTaskOverdue,
  isWithinDays,
} from "@shared/agro/date-utils";

export function formatDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
}

export const OPPORTUNITY_PRIORITY = {
  normal: "Normal",
  alta: "Alta",
} as const;

export const VALUE_FILTER_RANGES = {
  all: { label: "Todos os valores", min: 0, max: Infinity },
  ate_100k: { label: "Até R$ 100 mil", min: 0, max: 100_000 },
  "100k_200k": { label: "R$ 100–200 mil", min: 100_000, max: 200_000 },
  acima_200k: { label: "Acima de R$ 200 mil", min: 200_000, max: Infinity },
} as const;

export type ValueFilterKey = keyof typeof VALUE_FILTER_RANGES;