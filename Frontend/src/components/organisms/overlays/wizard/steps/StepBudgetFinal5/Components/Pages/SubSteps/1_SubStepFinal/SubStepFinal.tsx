import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { SavingsGoal } from "@/types/Wizard/SavingsFormValues";
import { Goal } from "@/types/Wizard/goal";
import { Coins, Home, Sprout, Scale } from 'lucide-react';
import FinalVerdictCard from '@/components/pures/FinalVerdictCard';
import SummaryPillarCard from '@/components/pures/SummaryPillarCard';
import { calcMonthlyIncome, sumArray } from '@/utils/wizard/wizardHelpers';
import { calculateTotalMonthlySavings } from '@/utils/budget/financialCalculations';
import { summariseDebts } from "@/utils/budget/debtCalculations";
import { useMemo } from 'react';
import DetailedLedger from '@/components/organisms/summaries/DetailedLedger';
import { formatCurrencyParts } from '@/utils/budget/currencyFormatter';
import { SummaryGrid } from './SummaryGrid';
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import { useSubtleFireworks } from '@/hooks/effects/useSubtleFireworks';
import { getExpenditureCategoryTotals } from "@/utils/budget/expenditureTotals";
import { useBudgetSummary } from "@/hooks/budget/useBudgetSummary";
import formatCurrency from '@/utils/budget/currencyFormatter';
import { cn } from "@/utils/cn";

interface SubStepFinalProps {
  onFinalize: () => Promise<boolean>;
  isFinalizing: boolean;
  finalizationError: string | null;
  onFinalizeSuccess: () => void;
}

type StrictGoal = {
  id: string;
  name: string;
  targetAmount: number;
  amountSaved: number;
  targetDate: string;
};

const SubStepFinal: React.FC<SubStepFinalProps> = ({
  onFinalize,
  isFinalizing,
  finalizationError,
  onFinalizeSuccess
}) => {
  const { income, expenditure, savings, debts } = useWizardDataStore((s) => s.data);

  const t = getExpenditureCategoryTotals(expenditure);


  const { fire } = useSubtleFireworks();


  const {
    categoryRows,
    breakdownRows,
    finalBalance,
    totalIncome,
    totalExpenditure,
    totalSavings,
    totalDebtPayments,
  } = useBudgetSummary();


  const handleFinalizeClick = async () => {
    const ok = await onFinalize();
    if (!ok) return;

    fire();

    // Close wizard immediately so nothing can flash underneath
    requestAnimationFrame(() => onFinalizeSuccess());

    // If you *need* a delay for navigation/animations, do it inside onFinalizeSuccess
    // or show a "Success!" screen inside the wizard instead of keeping it open with setTimeout.
  };

  const isComplete = (g: SavingsGoal): g is Omit<StrictGoal, "amountSaved"> & { amountSaved?: number | null } =>
    !!g.id &&
    !!g.name &&
    g.targetAmount != null &&
    g.targetAmount > 0 &&
    !!g.targetDate;

  const calculableGoals: Goal[] = (savings.goals ?? [])
    .filter(isComplete)
    .map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount!,
      amountSaved: g.amountSaved ?? 0,
      targetDate: new Date(g.targetDate),
    }));

  const goalSavings = calculateTotalMonthlySavings(calculableGoals);
  const habitSavings = savings.habits?.monthlySavings ?? 0;




  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;





  formatCurrencyParts(finalBalance);

  const pillarDescriptions = useMemo(() => {
    const expenditureCategories = [
      { name: 'Boende', value: t.housing },
      { name: 'Transport', value: t.transport },
      { name: 'Mat', value: t.food },
      { name: 'Fasta utgifter', value: t.fixed },
      { name: 'Prenumerationer', value: t.subscriptions },
      { name: 'Rörliga utgifter', value: t.variable },
    ].sort((a, b) => b.value - a.value);

    const top3 = expenditureCategories
      .filter(c => c.value > 0)
      .slice(0, 3)
      .map(c => c.name)
      .join(', ') || '—';

    return {
      income: "Från lön, sidoinkomster och andra källor i hushållet.",
      expenditure: `Dina största utgifter är ${top3}.`,
      savings: `Du sparar för ${calculableGoals.length} specifika mål. Utmärkt!`,
      debts: `Du har valt ${debts.summary?.repaymentStrategy === 'avalanche' ? 'Lavinen' : 'Snöbollen'} som din väg till skuldfrihet.`
    };
  }, [t, calculableGoals.length, debts.summary?.repaymentStrategy]);
  const breakdown = [
    { label: "Inkomster", value: totalIncome },
    { label: "Utgifter", value: -totalExpenditure },
    { label: "Sparande", value: -totalSavings },
    { label: "Skuldbetalningar", value: -totalDebtPayments },
  ];



  return (
    <div className="p-4 md:p-8 min-h-screen w-full">
      {/* Breakdown using whatever layout you want */}
      <div className="mb-6">
        <SummaryGrid
          title="Per månad"
          topRows={finalBalance < 0 ? breakdownRows : undefined}
          rows={categoryRows}
        />
      </div>


      <div className="space-y-12">
        <FinalVerdictCard balance={finalBalance} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <SummaryPillarCard icon={Coins} title="Inkomster" amount={totalIncome} description={pillarDescriptions.income} />
          <SummaryPillarCard icon={Home} title="Utgifter" amount={totalExpenditure} description={pillarDescriptions.expenditure} />
          <SummaryPillarCard icon={Sprout} title="Sparande" amount={totalSavings} description={pillarDescriptions.savings} />
          <SummaryPillarCard icon={Scale} title="Skulder" amount={totalDebtPayments} description={pillarDescriptions.debts} />
        </div>

        <DetailedLedger />

        {finalizationError && (
          <p className="text-red-600 text-center my-4">{finalizationError}</p>
        )}

        <div className="flex justify-center">
          <div className="w-full max-w-xl">
            <SubmitButton
              isSubmitting={isFinalizing}
              label="Skapa din budget!"
              size="large"
              className="bg-darkLimeGreen text-darkBlueMenuColor w-full"
              enhanceOnHover
              onClick={handleFinalizeClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubStepFinal;
