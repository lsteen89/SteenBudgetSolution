import { Goal } from '@/types/Wizard/goal';

/**
 * Calculates the required monthly contribution to reach a savings goal.
 */
export const calculateMonthlyContribution = (
  target: number | null | undefined,
  saved: number | null | undefined,
  date: Date | null | undefined
): number => {
  if (!target || !date) return 0;
  const remaining = Math.max(target - (saved ?? 0), 0);
  if (remaining === 0) return 0;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const end = new Date(date);
  if (end <= now) return remaining;

  const months = Math.max(
    (end.getFullYear() - now.getFullYear()) * 12 +
    (end.getMonth() - now.getMonth()) + 1,
    1,
  );

  return Math.ceil(remaining / months);
};

/**
 * Calculates the total of all monthly contributions for a list of goals.
 */
export const calculateTotalMonthlySavings = (goals: Goal[]): number => {
  if (!goals) return 0;
  return goals.reduce((total, goal) => {
    const monthlyContribution = calculateMonthlyContribution(
      goal.targetAmount,
      goal.amountSaved,
      goal.targetDate,
    );
    return total + monthlyContribution;
  }, 0);
};

/**
 * A calculation for compound interest.
 */
export const calculateFutureValue = (
  monthlyContribution: number,
  years: number,
  annualRate: number = 0.04
): number => {
  let total = 0;
  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;

  for (let i = 0; i < totalMonths; i++) {
    total += monthlyContribution;
    total *= (1 + monthlyRate);
  }

  return Math.round(total);
};

/**
 * Calculates the completion progress of a goal as a percentage.
 */
export const calcProgress = (
  target: number | null | undefined,
  saved: number | null | undefined
): number =>
  target ? Math.min(100, Math.round(((saved ?? 0) / target) * 100)) : 0;


/**
 * A spell to determine the number of moons required to complete a quest.
 * @param targetAmount The total treasure required.
 * @param amountSaved The treasure already gathered.
 * @param monthlyContribution The coin dedicated to the quest each moon.
 * @returns The number of moons until the quest is complete.
 */
export const calculateMonthsToGoal = (
  targetAmount: number,
  amountSaved: number,
  monthlyContribution: number
): number => {
  if (monthlyContribution <= 0) return Infinity; // A journey that never begins

  const remainingAmount = Math.max(0, targetAmount - amountSaved);
  if (remainingAmount === 0) return 0; // The quest is already complete!

  return Math.ceil(remainingAmount / monthlyContribution);
};