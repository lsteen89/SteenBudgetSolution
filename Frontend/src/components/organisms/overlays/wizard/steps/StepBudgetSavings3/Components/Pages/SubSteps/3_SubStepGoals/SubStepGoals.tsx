import { WizardStepHeader } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { getEffectiveGoalMonthlyContribution } from "@/utils/budget/financialCalculations";
import { tDict } from "@/utils/i18n/translate";
import { subStepGoalsDict } from "@/utils/i18n/wizard/stepSavings/SubStepGoals.i18n";
import React, { useDeferredValue, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import SavingsGoalsCard, {
  type SavingsGoalsCardApi,
} from "./components/SavingsGoalsCard";
import SavingsPlanSummaryCard from "./components/SavingsPlanSummaryCard";

type Props = { onGoToHabits?: () => void };

export type SubStepGoalsApi = {
  openFirstErrorGoal: () => void;
};

const SubStepGoals = React.forwardRef<SubStepGoalsApi, Props>(
  function SubStepGoals({ onGoToHabits }, ref) {
    const { control } = useFormContext<Step3FormValues>();
    const locale = useAppLocale();

    const t = <K extends keyof typeof subStepGoalsDict.sv>(k: K) =>
      tDict(k, locale, subStepGoalsDict);

    const goals = useWatch({ control, name: "goals" }) ?? [];
    const monthlySavings =
      useWatch({ control, name: "habits.monthlySavings" }) ?? 0;
    const deferredGoals = useDeferredValue(goals);
    const deferredMonthlySavings = useDeferredValue(monthlySavings);

    const requiredTotal = useMemo(
      () =>
        deferredGoals.reduce(
          (sum, g) =>
            sum +
            getEffectiveGoalMonthlyContribution({
              targetAmount: g?.targetAmount,
              amountSaved: g?.amountSaved,
              targetDate: g?.targetDate,
            }),
          0,
        ),
      [deferredGoals],
    );

    const goalsCardRef = React.useRef<SavingsGoalsCardApi>(null);

    React.useImperativeHandle(ref, () => ({
      openFirstErrorGoal: () => goalsCardRef.current?.openFirstErrorGoal(),
    }));

    return (
      <div>
        <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-8">
          <WizardStepHeader
            title=""
            stepPill={{
              stepNumber: 3,
              majorLabel: t("pillMajor"),
              subLabel: t("pillSub"),
            }}
            subtitle={t("subtitle")}
            helpTitle={t("helpTitle")}
            helpItems={[t("help1"), t("help2"), t("help3")]}
          />

          <SavingsPlanSummaryCard
            monthlySavings={deferredMonthlySavings}
            requiredTotal={requiredTotal}
            goalsCount={goals.length}
            onGoToHabits={onGoToHabits}
          />

          <SavingsGoalsCard ref={goalsCardRef} />
        </section>
      </div>
    );
  },
);

export default SubStepGoals;
