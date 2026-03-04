import React, { useDeferredValue, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { WizardStepHeader } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { requiredPerMonth } from "@/utils/budget/savingCalculations";
import SavingsGoalsCard, { type SavingsGoalsCardApi } from "./components/SavingsGoalsCard";
import SavingsPlanSummaryCard from "./components/SavingsPlanSummaryCard";

type Props = { onGoToHabits?: () => void };

export type SubStepGoalsApi = {
  openFirstErrorGoal: () => void;
};

const SubStepGoals = React.forwardRef<SubStepGoalsApi, Props>(function SubStepGoals(
  { onGoToHabits },
  ref
) {
  const { control } = useFormContext<Step3FormValues>();

  const goals = useWatch({ control, name: "goals" }) ?? [];
  const monthlySavings = useWatch({ control, name: "habits.monthlySavings" }) ?? 0;
  const deferredGoals = useDeferredValue(goals);
  const deferredMonthlySavings = useDeferredValue(monthlySavings);

  const requiredTotal = useMemo(
    () => deferredGoals.reduce((sum, g) => sum + requiredPerMonth(g), 0),
    [deferredGoals]
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
          stepPill={{ stepNumber: 3, majorLabel: "Sparande", subLabel: "Sparmål" }}
          subtitle="Dina mål är en plan för hur ditt månadssparande används."
          helpTitle="Så funkar det"
          helpItems={[
            "Ge målet ett namn, ett belopp och ett datum.",
            "Vi räknar ut ungefär vad målet kräver per månad.",
            "Du kan alltid ändra, pausa eller ta bort mål senare.",
          ]}
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
});

export default SubStepGoals;
