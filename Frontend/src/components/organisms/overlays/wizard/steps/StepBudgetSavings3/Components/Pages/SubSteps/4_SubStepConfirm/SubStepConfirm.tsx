import React from 'react';
import { motion } from 'framer-motion';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { calcMonthlyIncome, sumArray } from '@/utils/wizard/wizardHelpers';
import { calculateTotalMonthlySavings } from '@/utils/budget/savingsCalculations';
import FinancialSummaryCard from '@components/molecules/summaries/FinancialSummaryCard';
import SavingsDonutChart from '@components/molecules/charts/SavingsDonutChart';
import OptionContainer from '@components/molecules/containers/OptionContainer';
import useMediaQuery from '@/hooks/useMediaQuery';
import { calculateMonthlyContribution } from '@/utils/budget/goalCalculations';
import { Goal } from '@/types/Wizard/goal';

const SubStepConfirm: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { income, expenditure, savings } = useWizardDataStore((s) => s.data);

  const incomeTotal = calcMonthlyIncome(income);
  const expenditureTotal = sumArray([
    expenditure.rent?.monthlyRent,
    expenditure.rent?.rentExtraFees,
    expenditure.rent?.monthlyFee,
    expenditure.rent?.brfExtraFees,
    expenditure.rent?.mortgagePayment,
    expenditure.rent?.houseotherCosts,
    expenditure.rent?.otherCosts,
    expenditure.transport?.monthlyFuelCost,
    expenditure.transport?.monthlyInsuranceCost,
    expenditure.transport?.monthlyTotalCarCost,
    expenditure.transport?.monthlyTransitCost,
    expenditure.food?.foodStoreExpenses,
    expenditure.food?.takeoutExpenses,
    expenditure.fixedExpenses?.insurance,
    expenditure.fixedExpenses?.electricity,
    expenditure.fixedExpenses?.internet,
    expenditure.fixedExpenses?.phone,
    expenditure.fixedExpenses?.unionFees,
    ...(expenditure.fixedExpenses?.customExpenses?.map((e) => e?.cost) ?? []),
    expenditure.clothing?.monthlyClothingCost,
    expenditure.subscriptions?.netflix,
    expenditure.subscriptions?.spotify,
    expenditure.subscriptions?.hbomax,
    expenditure.subscriptions?.viaplay,
    expenditure.subscriptions?.disneyPlus,
    ...(expenditure.subscriptions?.customSubscriptions?.map((s) => s?.cost) ?? []),
  ]);

const validGoals =
  savings.goals?.filter(
    (g): g is Goal =>
      g.name != null &&
      g.name !== '' &&
      g.targetAmount != null &&
      g.targetAmount > 0 &&
      g.amountSaved != null &&
      g.targetDate != null,
  ) ?? [];

  const totalMonthlySavingsGoals = calculateTotalMonthlySavings(validGoals);
  const remainingAfterExpenses = incomeTotal - expenditureTotal;
  const generalSavings = remainingAfterExpenses - totalMonthlySavingsGoals;

  const savingsSlices = [
    ...(savings.goals?.map((goal) => ({
      name: goal.name ?? 'Okänt sparmål',
      value: calculateMonthlyContribution(goal.amountSaved, goal.amountSaved, goal.targetDate),
    })) ?? []),
    { name: 'Allmänt sparande', value: generalSavings },
  ].filter((slice) => slice.value > 0);

  return (
    <OptionContainer className="p-4">
      <section className="space-y-6 text-white">
        <motion.h3
          className="text-xl md:text-2xl font-bold text-center text-darkLimeGreen"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Sammanfattning av ditt sparande
        </motion.h3>

        <motion.p
          className="text-center text-white/80 max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Härligt! Du har nu definierat dina sparmål. Nedan ser du en sammanställning av hur ditt sparande förhåller sig till dina inkomster och utgifter.
        </motion.p>

        {isDesktop && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <SavingsDonutChart slices={savingsSlices} />
          </motion.div>
        )}

        <FinancialSummaryCard
          income={incomeTotal}
          expenses={expenditureTotal}
          savings={remainingAfterExpenses}
        />
      </section>
    </OptionContainer>
  );
};

export default SubStepConfirm;