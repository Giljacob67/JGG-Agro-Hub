import type {
  Account,
  Activity,
  Deadline,
  Lead,
  LeadList,
  Matter,
  Opportunity,
  Task,
} from "./types.js";

/**
 * IDs dos registros de demonstração que já foram semeados em bancos
 * existentes. Usado por `dbPurgeDemoData` para remover apenas os dados
 * fictícios, preservando leads reais (que usam IDs UUID: LD-<uuid>).
 */
export const DEMO_SEED_IDS = {
  leads: [
    "LD-001", "LD-002", "LD-003", "LD-004", "LD-005", "LD-006", "LD-007",
  ],
  accounts: [
    "AC-101", "AC-102", "AC-103", "AC-104", "AC-105", "AC-106", "AC-107",
  ],
  opportunities: [
    "OP-201", "OP-202", "OP-203", "OP-204", "OP-205",
    "OP-206", "OP-207", "OP-208", "OP-209",
  ],
  matters: [
    "MT-301", "MT-302", "MT-303", "MT-304", "MT-305",
    "MT-306", "MT-307", "MT-308", "MT-309",
  ],
  deadlines: [
    "DL-501", "DL-502", "DL-503", "DL-504",
    "DL-505", "DL-506", "DL-507", "DL-508",
  ],
  activities: [
    "ACT-601", "ACT-602", "ACT-603", "ACT-604",
    "ACT-605", "ACT-606", "ACT-607", "ACT-608",
  ],
  tasks: [
    "TK-401", "TK-402", "TK-403", "TK-404", "TK-405",
    "TK-406", "TK-407", "TK-408", "TK-409", "TK-410",
  ],
} as const;

export type DemoSeedIds = {
  [K in keyof typeof DEMO_SEED_IDS]: readonly string[];
};

/** Listas de prospecção (frentes de trabalho). Vazio por padrão. */
export const SEED_LEAD_LISTS: LeadList[] = [];

/** Site inicia vazio — dados de demonstração removidos. */
export const SEED_LEADS: Lead[] = [];

export const SEED_ACCOUNTS: Account[] = [];

export const SEED_OPPORTUNITIES: Opportunity[] = [];

export const SEED_MATTERS: Matter[] = [];

export const SEED_DEADLINES: Deadline[] = [];

export const SEED_ACTIVITIES: Activity[] = [];

export const SEED_TASKS: Task[] = [];

export const OPPORTUNITY_STAGES = [
  { id: "novo_contato" as const, label: "Novo contato" },
  { id: "diagnostico_agendado" as const, label: "Diagnóstico agendado" },
  { id: "diagnostico_realizado" as const, label: "Diagnóstico realizado" },
  { id: "proposta_elaboracao" as const, label: "Proposta em elaboração" },
  { id: "proposta_enviada" as const, label: "Proposta enviada" },
  { id: "negociacao" as const, label: "Em negociação" },
  { id: "contrato" as const, label: "Contratado" },
  { id: "perdido" as const, label: "Perdido" },
  { id: "arquivado" as const, label: "Arquivado" },
];

/**
 * Estágios terminais/negativos — excluídos do pipeline ativo (funil, valor,
 * colunas do board). Mantidos no enum para rótulo e seleção no detalhe.
 */
export const INACTIVE_OPPORTUNITY_STAGES = new Set(["perdido", "arquivado"]);
