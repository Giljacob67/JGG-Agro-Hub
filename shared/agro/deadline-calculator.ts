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

// ── Feriados nacionais (computados dinamicamente) ──────────────────
//
// Feriados fixos + móveis (derivados da Páscoa) calculados por ano, para
// não expirar. Inclui recesso forense (CPC art. 220, 20/12–20/01), durante
// o qual os prazos processuais ficam suspensos.

/** Domingo de Páscoa pelo algoritmo de Gauss/Anonymous Gregorian. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Formata uma data como "YYYY-MM-DD" em horário **local** (consistente
 *  com getDay/getDate usados no resto do módulo — evita drift de fuso). */
function localYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

const HOLIDAY_CACHE = new Map<number, Set<string>>();

/** Conjunto de feriados nacionais (fixos + móveis) para um ano. */
function nationalHolidays(year: number): Set<string> {
  const cached = HOLIDAY_CACHE.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const dates = [
    new Date(year, 0, 1), // Confraternização Universal
    new Date(year, 3, 21), // Tiradentes
    new Date(year, 4, 1), // Dia do Trabalho
    new Date(year, 8, 7), // Independência
    new Date(year, 9, 12), // Nossa Senhora Aparecida
    new Date(year, 10, 2), // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 10, 20), // Consciência Negra (Lei 14.759/2023)
    new Date(year, 11, 25), // Natal
    addDays(easter, -48), // Carnaval (segunda)
    addDays(easter, -47), // Carnaval (terça)
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, 60), // Corpus Christi
  ];

  const set = new Set(dates.map(localYmd));
  HOLIDAY_CACHE.set(year, set);
  return set;
}

function isHoliday(date: Date): boolean {
  return nationalHolidays(date.getFullYear()).has(localYmd(date));
}

/**
 * Recesso forense: prazos processuais suspensos de 20/12 a 20/01
 * (CPC art. 220). Dias nesse intervalo não contam como úteis.
 */
function isForensicRecess(date: Date): boolean {
  const month = date.getMonth(); // 0-based
  const day = date.getDate();
  return (month === 11 && day >= 20) || (month === 0 && day <= 20);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date) && !isForensicRecess(date);
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
  const days =
    type === "custom" && customDays != null ? customDays : config.businessDays;
  const dueDate = addBusinessDays(startDate, days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.max(0, countBusinessDays(today, dueDate));

  return {
    type,
    label: config.label,
    businessDays: days,
    description: config.description,
    dueDate: localYmd(dueDate),
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
