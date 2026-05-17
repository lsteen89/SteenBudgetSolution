import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";

export type SavingsGoalTone = "ahead" | "ontrack" | "behind" | "ongoing";

const PACE_THRESHOLD = 0.05;
export const PLANNED_MARKER_MIN_DISTANCE = 0.04;

export type SavingsGoalDerived = {
  actualPct: number | null;
  expectedPct: number | null;
  tone: SavingsGoalTone;
  monthsRemaining: number | null;
  monthsLatePositive: number | null;
};

export const shouldRenderPlannedMarker = (
  actualPct: number | null | undefined,
  plannedPct: number | null | undefined,
): boolean => {
  if (actualPct == null || plannedPct == null) return false;
  if (!Number.isFinite(actualPct) || !Number.isFinite(plannedPct)) return false;
  return Math.abs(actualPct - plannedPct) >= PLANNED_MARKER_MIN_DISTANCE;
};

export const getMonthStartDate = (yearMonth: string): Date => {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth ?? "");
  if (!match) return new Date(NaN);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, 1);
};

const parseTargetDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthsBetween = (from: Date, to: Date): number =>
  (to.getFullYear() - from.getFullYear()) * 12 +
  (to.getMonth() - from.getMonth());

export const deriveSavingsGoal = (
  row: BudgetMonthSavingsGoalEditorRowDto,
  referenceDate: Date,
): SavingsGoalDerived => {
  const target = row.targetAmount;
  const saved = row.amountSaved;
  const monthly = row.monthlyContribution;
  const targetDate = parseTargetDate(row.targetDate);

  const actualPct =
    target != null && target > 0
      ? Math.max(0, Math.min(1, (saved ?? 0) / target))
      : null;

  const remaining =
    target != null ? Math.max(0, target - (saved ?? 0)) : null;
  const monthsRemaining =
    remaining != null && monthly > 0 ? Math.ceil(remaining / monthly) : null;

  const referenceIsValid = !Number.isNaN(referenceDate.getTime());

  if (
    !referenceIsValid ||
    !targetDate ||
    target == null ||
    target <= 0 ||
    monthly <= 0
  ) {
    return {
      actualPct,
      expectedPct: null,
      tone: "ongoing",
      monthsRemaining,
      monthsLatePositive: null,
    };
  }

  const monthsTotal = target / monthly;
  const monthsTillTarget = monthsBetween(referenceDate, targetDate);
  const monthsSinceStart = monthsTotal - monthsTillTarget;
  const expectedPct = Math.max(0, Math.min(1, monthsSinceStart / monthsTotal));

  const monthsAtCurrentPace = monthsRemaining ?? 0;
  const monthsLate = monthsAtCurrentPace - Math.max(0, monthsTillTarget);

  let tone: SavingsGoalTone = "ontrack";
  if ((actualPct ?? 0) - expectedPct > PACE_THRESHOLD) tone = "ahead";
  else if (expectedPct - (actualPct ?? 0) > PACE_THRESHOLD) tone = "behind";

  return {
    actualPct,
    expectedPct,
    tone,
    monthsRemaining,
    monthsLatePositive: monthsLate,
  };
};

const MASCOT_BUCKETS = ["goalBird", "savingsBird", "calcBird", "richBird"] as const;
export type SavingsMascotKey = (typeof MASCOT_BUCKETS)[number];

const hash = (input: string): number => {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

export const mascotForGoal = (
  row: BudgetMonthSavingsGoalEditorRowDto,
): SavingsMascotKey =>
  MASCOT_BUCKETS[hash(row.sourceSavingsGoalId ?? row.id) % MASCOT_BUCKETS.length];

export type SavingsHeroNextMilestone = {
  goalName: string;
  months: number;
};

const getValidNextMilestone = (
  row: BudgetMonthSavingsGoalEditorRowDto,
): SavingsHeroNextMilestone | null => {
  const goalName = row.name?.trim();
  if (!goalName) return null;

  const targetDate = parseTargetDate(row.targetDate);
  if (!targetDate) return null;

  const target = row.targetAmount;
  if (target == null || !Number.isFinite(target) || target <= 0) return null;

  const saved = row.amountSaved ?? 0;
  if (!Number.isFinite(saved) || saved < 0) return null;

  const monthly = row.monthlyContribution;
  if (!Number.isFinite(monthly) || monthly <= 0) return null;

  const remaining = target - saved;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;

  const months = Math.ceil(remaining / monthly);
  if (!Number.isFinite(months) || months <= 0) return null;

  return { goalName, months };
};

export type SavingsHeroAggregate = {
  totalMonthly: number;
  totalSaved: number;
  totalTarget: number;
  goalCount: number;
  aheadCount: number;
  behindCount: number;
  hasPlannedMarker: boolean;
  nextMilestone: SavingsHeroNextMilestone | null;
};

export const aggregateSavingsHero = (
  rows: BudgetMonthSavingsGoalEditorRowDto[],
  referenceDate: Date,
): SavingsHeroAggregate => {
  let totalMonthly = 0;
  let totalSaved = 0;
  let totalTarget = 0;
  let aheadCount = 0;
  let behindCount = 0;
  let hasPlannedMarker = false;
  let nextMilestone: SavingsHeroNextMilestone | null = null;

  for (const row of rows) {
    totalMonthly += row.monthlyContribution;
    totalSaved += row.amountSaved ?? 0;
    totalTarget += row.targetAmount ?? 0;

    const { tone, actualPct, expectedPct } = deriveSavingsGoal(row, referenceDate);
    if (tone === "ahead") aheadCount += 1;
    if (tone === "behind") behindCount += 1;
    if (shouldRenderPlannedMarker(actualPct, expectedPct)) {
      hasPlannedMarker = true;
    }

    const candidate = getValidNextMilestone(row);
    if (
      candidate &&
      (nextMilestone == null || candidate.months < nextMilestone.months)
    ) {
      nextMilestone = candidate;
    }
  }

  return {
    totalMonthly,
    totalSaved,
    totalTarget,
    goalCount: rows.length,
    aheadCount,
    behindCount,
    hasPlannedMarker,
    nextMilestone,
  };
};
