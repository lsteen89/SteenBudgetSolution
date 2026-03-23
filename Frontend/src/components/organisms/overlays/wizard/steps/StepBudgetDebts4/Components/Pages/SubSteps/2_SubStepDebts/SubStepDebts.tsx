import { useFormContext, useWatch } from "react-hook-form";

import { WizardStepHeader } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import DebtsPlanSummaryCard from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/2_SubStepDebts/components/DebtsPlanSummaryCard";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { DebtsFormValues } from "@/types/Wizard/Step4_Debt/DebtFormValues";
import { rollupDebts } from "@/utils/budget/debtMath";
import { tDict } from "@/utils/i18n/translate";
import { subStepDebtsDict } from "@/utils/i18n/wizard/stepDebt/SubStepDebts.i18n";
import React, { useMemo } from "react";
import DebtsCard, { type DebtsCardApi } from "./components/DebtsCard";

export type SubStepDebtsApi = {
  openFirstErrorDebt: () => void;
};

const SubStepDebts = React.forwardRef<SubStepDebtsApi>(
  function SubStepDebts(_props, ref) {
    const { control } = useFormContext<DebtsFormValues>();
    const locale = useAppLocale();

    const t = <K extends keyof typeof subStepDebtsDict.sv>(k: K) =>
      tDict(k, locale, subStepDebtsDict);

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
            stepPill={{
              stepNumber: 4,
              majorLabel: t("pillMajor"),
              subLabel: t("pillSub"),
            }}
            subtitle={t("subtitle")}
            helpTitle={t("helpTitle")}
            helpItems={[t("help1"), t("help2"), t("help3")]}
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
  },
);

export default SubStepDebts;
