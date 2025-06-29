import { Goal } from '@/types/Wizard/goal';
import { calculateMonthlyContribution } from './goalCalculations';

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
