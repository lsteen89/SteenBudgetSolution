import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { WizardStepHeader } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import type { DebtsFormValues } from "@/types/Wizard/Step4_Debt/DebtFormValues";
import DebtsPlanSummaryCard from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/2_SubStepDebts/components/DebtsPlanSummaryCard";
import DebtsCard, { type DebtsCardApi } from "./components/DebtsCard";
import { rollupDebts } from "@/utils/budget/debtMath";

export type SubStepDebtsApi = {
  openFirstErrorDebt: () => void;
};

const SubStepDebts = React.forwardRef<SubStepDebtsApi>(function SubStepDebts(_props, ref) {
  const { control } = useFormContext<DebtsFormValues>();

  const debts = useWatch({ control, name: "debts" }) ?? [];
  const totals = useMemo(() => rollupDebts(debts), [debts]);

  const debtsCardRef = React.useRef<DebtsCardApi>(null);

  React.useImperativeHandle(ref, () => ({
    openFirstErrorDebt: () => debtsCardRef.current?.openFirstErrorDebt(),
  }));

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-8">
        <WizardStepHeader
          title=""
          stepPill={{ stepNumber: 4, majorLabel: "Skulder", subLabel: "Skulder" }}
          subtitle="Lägg in dina skulder så uppskattar vi månadskostnaden."
          helpTitle="Så funkar det"
          helpItems={[
            "Om du vet minsta betalning (t.ex. kreditkort), fyll i den.",
            "Annars räcker belopp, ränta och löptid för en bra uppskattning.",
            "Du kan alltid justera siffrorna senare.",
          ]}
        />

        <DebtsPlanSummaryCard
          debtsCount={debts.length}
          totalBalance={totals.totalBalance}
          estMonthlyTotal={totals.estMonthlyTotal}
          incompleteCount={totals.incompleteCount}
        />


        <DebtsCard ref={debtsCardRef} />
      </section>
    </div>
  );
});

export default SubStepDebts;
