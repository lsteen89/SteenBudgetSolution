import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { SavingsGoal } from "@/types/Wizard/SavingsFormValues";
import { Goal } from "@/types/Wizard/goal";
import { useNavigate } from 'react-router-dom';
import { Coins, Home, Sprout, Scale, ArrowRight } from 'lucide-react';
import FinalVerdictCard from '@/components/pures/FinalVerdictCard';
import SummaryPillarCard from '@/components/pures/SummaryPillarCard';
import { calcMonthlyIncome, sumArray } from '@/utils/wizard/wizardHelpers';
import { calculateTotalMonthlySavings } from '@/utils/budget/financialCalculations';
import { summariseDebts } from "@/utils/budget/debtCalculations";
import { useMemo } from 'react';
import DetailedLedger from '@/components/organisms/summaries/DetailedLedger';
import { cn } from '@/utils/cn';
import { formatCurrencyParts, formatCurrency } from '@/utils/budget/currencyFormatter';
import { SummaryGrid } from './SummaryGrid';
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import { useSubtleFireworks } from '@/hooks/effects/useSubtleFireworks';

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
  const totalIncome = calcMonthlyIncome(income);

  // 2. Total Monthly Expenditure (The Grand Summation Spell, also from the Scroll of Totals)
  const totalExpenditure = sumArray([
    expenditure.rent?.monthlyRent, expenditure.rent?.rentExtraFees, expenditure.rent?.monthlyFee, expenditure.rent?.brfExtraFees, expenditure.rent?.mortgagePayment, expenditure.rent?.houseotherCosts, expenditure.rent?.otherCosts,
    expenditure.transport?.monthlyFuelCost, expenditure.transport?.monthlyInsuranceCost, expenditure.transport?.monthlyTotalCarCost, expenditure.transport?.monthlyTransitCost,
    expenditure.food?.foodStoreExpenses, expenditure.food?.takeoutExpenses,
    expenditure.fixedExpenses?.insurance, expenditure.fixedExpenses?.electricity, expenditure.fixedExpenses?.internet, expenditure.fixedExpenses?.phone, expenditure.fixedExpenses?.unionFees,
    ...(expenditure.fixedExpenses?.customExpenses?.map((e) => e?.cost) ?? []),
    expenditure.clothing?.monthlyClothingCost,
    expenditure.subscriptions?.netflix, expenditure.subscriptions?.spotify, expenditure.subscriptions?.hbomax, expenditure.subscriptions?.viaplay, expenditure.subscriptions?.disneyPlus,
    ...(expenditure.subscriptions?.customSubscriptions?.map((s) => s?.cost) ?? []),
  ]);

  const { fire } = useSubtleFireworks();

  const handleFinalizeClick = async () => {
    const ok = await onFinalize();
    if (!ok) return;

    // success -> fireworks + slight pause -> dashboard
    fire();
    setTimeout(() => {
      onFinalizeSuccess();
    }, 900);
  };



  // --- The Ritual Begins ---
  const isComplete = (g: SavingsGoal): g is StrictGoal =>
    !!g.id &&
    !!g.name &&
    g.targetAmount != null &&
    g.targetAmount > 0 &&
    g.amountSaved != null &&
    !!g.targetDate;


  const calculableGoals: Goal[] = (savings.goals ?? [])
    .filter(isComplete)
    .map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      amountSaved: g.amountSaved,
      targetDate: new Date(g.targetDate),
    }));

  const pillarDescriptions = useMemo(() => {
    // For the Expenditure Pillar, we find the top 3 categories
    const expenditureCategories = [
      { name: 'Boende', value: sumArray([expenditure.rent?.monthlyRent, expenditure.rent?.rentExtraFees, /* etc. */]) },
      { name: 'Transport', value: sumArray([expenditure.transport?.monthlyFuelCost, /* etc. */]) },
      { name: 'Mat', value: sumArray([expenditure.food?.foodStoreExpenses, /* etc. */]) },
      // ... add all other main categories here ...
    ].sort((a, b) => b.value - a.value);

    const top3Expenditures = expenditureCategories.slice(0, 3).map(c => c.name).join(', ');


    return {
      income: "Från lön, sidoinkomster och andra källor i hushållet.",
      expenditure: `Dina största utgifter är ${top3Expenditures}.`,
      savings: `Du sparar för ${calculableGoals.length} specifika mål. Utmärkt!`,
      debts: `Du har valt ${debts.summary?.repaymentStrategy === 'avalanche' ? 'Lavinen' : 'Snöbollen'} som din väg till skuldfrihet.`
    };
  }, [expenditure, calculableGoals, debts.summary?.repaymentStrategy]);
  const goalSavings = calculateTotalMonthlySavings(calculableGoals);
  const habitSavings = savings.habits?.monthlySavings ?? 0;
  const totalSavings = goalSavings + habitSavings;

  const { totalMonthlyPayment: totalDebtPayments } = summariseDebts(debts.debts ?? []);
  const finalBalance = totalIncome - totalExpenditure - totalSavings - totalDebtPayments;
  const { number, currency } = formatCurrencyParts(finalBalance);

  return (
    <div className="p-4 md:p-8 min-h-screen w-full">
      <div className="max-w-xl mx-auto bg-black/30 backdrop-blur-sm/6 p-6
                          rounded-xl mb-12 text-center shadow-lg">
        <h1 className="text-4xl font-bold text-darkLimeGreen">
          Grattis, du har färdig<wbr />ställt din budget!
        </h1>
        <p className="mt-4 text-white/70">
          Här är den, din hjälp att få koll på dina&nbsp;utgifter och sparande. <br />
          Ju mer noggrant du har lagt in dina kostnader, desto mer precis blir din budget. <br />
          Ta en titt, begrunda och agera, tillsammans når vi högre höjder!
        </p>
      </div>

      <SummaryGrid
        title="Per månad"
        rows={[
          { label: "Inkomster", value: totalIncome },
          { label: "Utgifter", value: totalExpenditure },
          { label: "Sparade", value: totalSavings },
          { label: "Totala skulder", value: totalDebtPayments },
        ]}
        resultLabel="Resultat"
        resultValue={finalBalance}
      />

      <div className="space-y-12">
        {/* I. The Final Verdict, now forged and placed! */}
        <FinalVerdictCard balance={finalBalance} />

        {/* II. The Four Pillars will now stand! */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryPillarCard
            icon={Coins}
            title="Inkomster"
            amount={totalIncome}
            description={pillarDescriptions.income}
          />
          <SummaryPillarCard
            icon={Home}
            title="Utgifter"
            amount={totalExpenditure}
            description={pillarDescriptions.expenditure}
          />
          <SummaryPillarCard
            icon={Sprout}
            title="Sparande"
            amount={totalSavings}
            description={pillarDescriptions.savings}
          />
          <SummaryPillarCard
            icon={Scale}
            title="Skulder"
            amount={totalDebtPayments}
            description={pillarDescriptions.debts}
          />
        </div>

        {/* III. The Detailed Ledger, now in its place */}
        <DetailedLedger />

        {finalizationError && (
          <p className="text-red-600 text-center my-4">
            {finalizationError}
          </p>
        )}

        <SubmitButton
          isSubmitting={isFinalizing}
          label="Skapa din budget!"
          size="large"
          className="bg-darkLimeGreen text-darkBlueMenuColor"
          enhanceOnHover
          onClick={handleFinalizeClick}
        />

      </div>
    </div>
  );
};

export default SubStepFinal;