import React from 'react';
import { motion } from 'framer-motion';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { calcMonthlyIncome, sumArray } from '@/utils/wizard/wizardHelpers';
import { calculateTotalMonthlySavings, calculateMonthlyContribution, calculateFutureValue } from '@/utils/budget/financialCalculations';
import { Goal } from '@/types/Wizard/goal';
import OptionContainer from '@components/molecules/containers/OptionContainer';
import GoalSummary from '@/components/organisms/summaries/GoalSummary';
import PotentialAnalysis from '@/components/organisms/summaries/PotentialAnalysis';
import HabitProjection from '@/components/organisms/summaries/HabitProjection';
import { SavingsGoal } from "@/types/Wizard/SavingsFormValues";

// --- The Great Scroll Begins ---
type StrictGoal = {
  id: string;
  name: string;
  targetAmount: number;   // no null
  amountSaved: number;    // no null
  targetDate: string;     // still a string in the UI layer
};
const SubStepConfirm: React.FC = () => {
  const { income, expenditure, savings } = useWizardDataStore((s) => s.data);
  console.log('The true nature of the Savings a Hobbit keeps:', savings.habits);
  // --- Core Calculations ---
  const incomeTotal = calcMonthlyIncome(income);
  const rawGoals: SavingsGoal[] = savings.goals ?? [];
  // ====== THIS SPELL IS NOW REVIVED ======
  const expenditureTotal = sumArray([
    expenditure.rent?.monthlyRent, expenditure.rent?.rentExtraFees, expenditure.rent?.monthlyFee, expenditure.rent?.brfExtraFees, expenditure.rent?.mortgagePayment, expenditure.rent?.houseotherCosts, expenditure.rent?.otherCosts,
    expenditure.transport?.monthlyFuelCost, expenditure.transport?.monthlyInsuranceCost, expenditure.transport?.monthlyTotalCarCost, expenditure.transport?.monthlyTransitCost,
    expenditure.food?.foodStoreExpenses, expenditure.food?.takeoutExpenses,
    expenditure.fixedExpenses?.insurance, expenditure.fixedExpenses?.electricity, expenditure.fixedExpenses?.internet, expenditure.fixedExpenses?.phone, expenditure.fixedExpenses?.unionFees,
    ...(expenditure.fixedExpenses?.customExpenses?.map((e) => e?.cost) ?? []),
    expenditure.clothing?.monthlyClothingCost,
    expenditure.subscriptions?.netflix, expenditure.subscriptions?.spotify, expenditure.subscriptions?.hbomax, expenditure.subscriptions?.viaplay, expenditure.subscriptions?.disneyPlus,
    ...(expenditure.subscriptions?.customSubscriptions?.map((s) => s?.cost) ?? []),
  ]);
  // =======================================

  const disposableIncome = incomeTotal - expenditureTotal;
  const hasActiveSavingsHabit = savings.habits?.monthlySavings && savings.habits.monthlySavings > 0;

  const isComplete = (g: SavingsGoal): g is StrictGoal =>
    !!g.id &&
    !!g.name &&
    g.targetAmount != null &&
    g.targetAmount > 0 &&
    g.amountSaved != null &&
    !!g.targetDate;

  /* 3️⃣  Safe list for maths → convert date */
  const calculableGoals: Goal[] = (savings.goals ?? [])
    .filter(isComplete)                       // now StrictGoal[]
    .map(g => ({
      id: g.id,
      name: g.name,                           // string
      targetAmount: g.targetAmount,           // number
      amountSaved: g.amountSaved,             // number
      targetDate: new Date(g.targetDate),     // Date
    }));

  const totalMonthlySavingsGoals = calculateTotalMonthlySavings(calculableGoals);
    
  const generalSavings = disposableIncome - totalMonthlySavingsGoals;

  // This party is for display. It is more lenient.
  // It only requires that a quest has a name and a destination.
  const displayableGoals = savings.goals?.filter(g =>
      g.name != null && g.name !== '' && g.targetAmount != null && g.targetAmount > 0 && g.targetDate != null
  ) ?? [];

    return (
    <OptionContainer className="p-1">
      <section className="space-y-8 text-white">
        <motion.h3 /* ... The main title ... */ >
          Dina väg mot ekonomisk frihet
        </motion.h3>

        {/* The First Pillar: Always present */}
        <GoalSummary goals={displayableGoals} income={income} />

        {/* The Second Pillar: Always present */}
        <PotentialAnalysis generalSavings={generalSavings} />

        {/* The Third Pillar: Only for those with a habit */}
        {hasActiveSavingsHabit && savings.habits && (
          <HabitProjection monthlySavings={savings.habits.monthlySavings ?? 0} />
        )}

      </section>
    </OptionContainer>
  );
};

export default SubStepConfirm;