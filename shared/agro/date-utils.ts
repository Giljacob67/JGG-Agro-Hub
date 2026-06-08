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