import type { MatterStatus, RiskLevel, TaskStatus } from "./types.js";

/**
 * "Hoje" aqui SEMPRE significa o dia corrente em São Paulo, nunca o fuso do
 * processo que executa o código. Este módulo é compartilhado entre o
 * browser do usuário (fuso local, tipicamente America/Sao_Paulo) e as
 * funções serverless na Vercel (rodam em UTC por padrão). Sem fixar o
 * fuso, `isOverdue`/`isCriticalDeadline` podiam divergir entre client e
 * server durante a janela diária (~21h-24h horário de Brasília, quando o
 * UTC já virou o dia seguinte) em que os dois relógios discordam sobre
 * qual é o dia atual — inconsistência real num CRM jurídico onde "prazo
 * vencido" no dashboard (server) podia não bater com o card de detalhe
 * (client), ou vice-versa.
 */
const TIME_ZONE = "America/Sao_Paulo";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Formata um instante como "YYYY-MM-DD" no fuso de São Paulo. */
function ymdInSaoPaulo(instant: Date): string {
  // en-CA formata datas como YYYY-MM-DD.
  return ymdFormatter.format(instant);
}

/**
 * Datas de negócio (`deadline`, `dueDate`, `nextContact`) são strings
 * "YYYY-MM-DD" puras (sem hora), então comparação lexicográfica é
 * suficiente e evita todo o parsing de Date/fuso que causava o bug
 * original — mesmo formato ordena cronologicamente como string.
 */
export function isOverdue(date: string, now: Date = new Date()): boolean {
  return date < ymdInSaoPaulo(now);
}

export function isWithinDays(
  date: string,
  days: number,
  now: Date = new Date(),
): boolean {
  const todayYmd = ymdInSaoPaulo(now);
  // T00:00:00Z é seguro aqui: as duas datas usam a mesma âncora UTC só
  // para a aritmética de "+N dias" e a comparação, nunca para exibição.
  const today = new Date(`${todayYmd}T00:00:00Z`);
  const target = new Date(`${date}T00:00:00Z`);
  const limit = new Date(today);
  limit.setUTCDate(limit.getUTCDate() + days);
  return target >= today && target <= limit;
}

export function isCriticalDeadline(
  date: string,
  risk?: RiskLevel,
  status?: MatterStatus,
  now: Date = new Date(),
): boolean {
  if (status === "concluida") return false;
  if (isOverdue(date, now)) return true;
  if (risk === "critico" || risk === "alto") {
    return isWithinDays(date, 3, now);
  }
  return false;
}

export function isTaskOverdue(
  task: { dueDate: string; status: TaskStatus },
  now: Date = new Date(),
): boolean {
  return (
    task.status !== "concluida" &&
    (task.status === "atrasada" || isOverdue(task.dueDate, now))
  );
}
