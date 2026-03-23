import type { AppLocale } from "@/types/i18n/appLocale";

export function monthsToTarget(monthly: number, target: number) {
  if (!Number.isFinite(monthly) || monthly <= 0) return null;
  return Math.ceil(target / monthly);
}

export function formatDuration(totalMonths: number | null, locale: AppLocale) {
  if (!totalMonths || totalMonths <= 0) return "—";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const isSv = locale.startsWith("sv");
  const isEt = locale.startsWith("et");

  const yearLabel = isSv
    ? years === 1
      ? "år"
      : "år"
    : isEt
      ? years === 1
        ? "aasta"
        : "aastat"
      : years === 1
        ? "year"
        : "years";

  const monthLabel = isSv
    ? months === 1
      ? "månad"
      : "månader"
    : isEt
      ? months === 1
        ? "kuu"
        : "kuud"
      : months === 1
        ? "month"
        : "months";

  const joinWord = isSv ? " och " : isEt ? " ja " : " and ";

  const yearPart = years > 0 ? `${years} ${yearLabel}` : "";
  const monthPart = months > 0 ? `${months} ${monthLabel}` : "";

  return [yearPart, monthPart].filter(Boolean).join(joinWord);
}

export function calculateBoost(
  currentMonthly: number,
  target: number,
  boostAmount = 1000,
) {
  if (!Number.isFinite(currentMonthly) || currentMonthly <= 0) return null;
  const currentMonths = Math.ceil(target / currentMonthly);
  const boostedMonths = Math.ceil(target / (currentMonthly + boostAmount));
  return Math.max(0, currentMonths - boostedMonths);
}

function monthsBetweenTodayAnd(date: Date) {
  const a = new Date();
  a.setHours(0, 0, 0, 0);

  const b = new Date(date);
  b.setHours(0, 0, 0, 0);

  const months =
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

  return Math.max(1, months + (b.getDate() > a.getDate() ? 1 : 0));
}

export function requiredPerMonth(goal: {
  targetAmount: number | null;
  amountSaved?: number | null;
  targetDate?: string | null;
}) {
  if (!goal.targetAmount || goal.targetAmount <= 0) return 0;
  if (!goal.targetDate) return 0;

  const date = new Date(String(goal.targetDate).split("T")[0]);
  if (Number.isNaN(date.getTime())) return 0;

  const saved = Math.max(0, Number(goal.amountSaved ?? 0));
  const remaining = Math.max(0, goal.targetAmount - saved);
  const months = monthsBetweenTodayAnd(date);

  return remaining / months;
}
