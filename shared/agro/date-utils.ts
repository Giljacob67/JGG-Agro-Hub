import type { MatterStatus, RiskLevel, TaskStatus } from "./types.js";

export function isOverdue(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date + "T12:00:00") < today;
}

export function isWithinDays(date: string, days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date + "T12:00:00");
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return target >= today && target <= limit;
}

export function isCriticalDeadline(
  date: string,
  risk?: RiskLevel,
  status?: MatterStatus,
) {
  if (status === "concluida") return false;
  if (isOverdue(date)) return true;
  if (risk === "critico" || risk === "alto") {
    return isWithinDays(date, 3);
  }
  return false;
}

export function isTaskOverdue(task: { dueDate: string; status: TaskStatus }) {
  return (
    task.status !== "concluida" &&
    (task.status === "atrasada" || isOverdue(task.dueDate))
  );
}