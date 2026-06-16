/**
 * Calculadora de prazos processuais brasileiros.
 * Calcula prazos em dias uteis, excluindo feriados e finais de semana.
 */

export type DeadlineType =
  | "contestacao"
  | "recurso_apelacao"
  | "recurso_agravo"
  | "recurso_especial"
  | "recurso_extraordinario"
  | "impugnacao"
  | "manifestacao"
  | "audiencia"
  | "pericia"
  | "sentenca"
  | "custom";

export interface DeadlineCalculation {
  type: DeadlineType;
  label: string;
  businessDays: number;
  description: string;
}

// ── Prazos processuais (dias uteis) ────────────────────────────────

export const PROCEDURAL_DEADLINES: Record<DeadlineType, Omit<DeadlineCalculation, "type">> = {
  contestacao: {
    label: "Contestação",
    businessDays: 15,
    description: "15 dias úteis para contestação (CPC, art. 335)",
  },
  recurso_apelacao: {
    label: "Apelação",
    businessDays: 15,
    description: "15 dias úteis para apelação (CPC, art. 1003)",
  },
  recurso_agravo: {
    label: "Agravo de Instrumento",
    businessDays: 15,
    description: "15 dias úteis para agravo de instrumento (CPC, art. 1030)",
  },
  recurso_especial: {
    label: "Recurso Especial",
    businessDays: 15,
    description: "15 dias úteis para recurso especial (CPC, art. 1035)",
  },
  recurso_extraordinario: {
    label: "Recurso Extraordinário",
    businessDays: 15,
    description: "15 dias úteis para recurso extraordinário (CPC, art. 1036)",
  },
  impugnacao: {
    label: "Impugnação",
    businessDays: 15,
    description: "15 dias úteis para impugnação (CPC, art. 696)",
  },
  manifestacao: {
    label: "Manifestação",
    businessDays: 15,
    description: "15 dias úteis para manifestação",
  },
  audiencia: {
    label: "Audiência",
    businessDays: 0,
    description: "Data fixada pelo juiz",
  },
  pericia: {
    label: "Perícia",
    businessDays: 0,
    description: "Prazo pericial (varia conforme ordem judicial)",
  },
  sentenca: {
    label: "Sentença",
    businessDays: 0,
    description: "Prazo do juiz para sentenciar",
  },
  custom: {
    label: "Prazo personalizado",
    businessDays: 10,
    description: "Prazo livre em dias úteis",
  },
};

// ── Feriados nacionais 2024-2026 (expandível) ─────────────────────

const NATIONAL_HOLIDAYS = [
  // 2024
  "2024-01-01", "2024-02-12", "2024-02-13", "2024-02-14",
  "2024-03-29", "2024-04-21", "2024-05-01", "2024-05-30",
  "2024-06-12", "2024-09-07", "2024-10-12", "2024-11-02",
  "2024-11-15", "2024-11-20", "2024-12-25",
  // 2025
  "2025-01-01", "2025-03-03", "2025-03-04", "2025-04-18",
  "2025-04-21", "2025-05-01", "2025-06-19", "2025-09-07",
  "2025-10-12", "2025-11-02", "2025-11-15", "2025-11-20",
  "2025-12-25",
  // 2026
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03",
  "2026-04-21", "2026-05-01", "2026-06-04", "2026-09-07",
  "2026-10-12", "2026-11-02", "2026-11-15", "2026-11-20",
  "2026-12-25",
];

function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().slice(0, 10);
  return NATIONAL_HOLIDAYS.includes(dateStr);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

// ── Funções de cálculo ─────────────────────────────────────────────

/**
 * Calcula a data de vencimento somando N dias uteis a partir de uma data base.
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate);
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      added++;
    }
  }

  return result;
}

/**
 * Calcula a quantidade de dias uteis entre duas datas.
 */
export function countBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);

  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      count++;
    }
  }

  return count;
}

/**
 * Calcula um prazo processual completo.
 */
export function calculateDeadline(
  startDate: Date,
  type: DeadlineType,
  customDays?: number,
): DeadlineCalculation & { dueDate: string; daysRemaining: number } {
  const config = PROCEDURAL_DEADLINES[type];
  const days = type === "custom" && customDays ? customDays : config.businessDays;
  const dueDate = addBusinessDays(startDate, days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.max(0, countBusinessDays(today, dueDate));

  return {
    type,
    label: config.label,
    businessDays: days,
    description: config.description,
    dueDate: dueDate.toISOString().slice(0, 10),
    daysRemaining,
  };
}

/**
 * Lista todos os tipos de prazos disponíveis para o usuário.
 */
export function getAvailableDeadlineTypes(): DeadlineCalculation[] {
  return Object.entries(PROCEDURAL_DEADLINES).map(([type, config]) => ({
    type: type as DeadlineType,
    ...config,
  }));
}

/**
 * Verifica se uma data cai em dia útil.
 */
export function isBusinessDayCheck(date: Date): boolean {
  return isBusinessDay(date);
}

/**
 * Retorna o próximo dia útil a partir de uma data.
 */
export function nextBusinessDay(date: Date): Date {
  const result = new Date(date);
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}
