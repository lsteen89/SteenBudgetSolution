export const calcMonthly = (
  target: number | null | undefined,
  saved: number | null | undefined,
  date: string | null | undefined
): number | null => {
  if (!target || !date) return null;
  const remaining = target - (saved ?? 0);
  if (remaining <= 0) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(date);
  if (end <= now) return remaining;

  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + 1;
  if (months <= 0) return remaining;

  return Math.ceil(remaining / months);
};

export const calcProgress = (
  target: number | null | undefined,
  saved: number | null | undefined
): number => {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round(((saved ?? 0) / target) * 100));
};