import React, { useCallback, useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { DebtsFormValues } from "@/types/Wizard/Step4_Debt/DebtFormValues";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import { mapFinalizationPreviewToDebtsConfirm } from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Mapping/mapFinalizationPreviewToDebtsConfirm";

import DebtMinimumRealityCard from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Components/DebtMinimumRealityCard";
import DebtSnapshotCard from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Components/DebtSnapshotCard";
import DebtAnchorsCard from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Components/DebtAnchorsCard";
import DebtStrategyPicker from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Components/DebtStrategyPicker";
import type { RepaymentStrategy } from "@/types/Wizard/Step4_Debt/DebtFormValues";

type Props = { preview?: BudgetDashboardDto; onContinue?: () => void };

export default function SubStepConfirmDebts({ preview, onContinue }: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();
  const money0 = useCallback(
    (v: number) => formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 }),
    [currency, locale]
  );

  const { control, setValue, formState: { errors } } = useFormContext<DebtsFormValues>();
  const repaymentStrategy = useWatch({ control, name: "summary.repaymentStrategy" }) as RepaymentStrategy | undefined;

  const vm = useMemo(() => (preview ? mapFinalizationPreviewToDebtsConfirm(preview) : null), [preview]);

  useEffect(() => {
    if (!vm) return;
    if (repaymentStrategy) return;

    const s = vm.repaymentStrategy;
    if (s && s !== "unknown") {
      setValue("summary.repaymentStrategy", s, { shouldDirty: true, shouldValidate: false });
    }
  }, [vm, repaymentStrategy, setValue]);

  console.log("SubStepConfirmDebts render", { vm, repaymentStrategy });

  if (!preview || !vm) {
    return (
      <div className="p-4">
        <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6">
          <WizardStepHeader
            stepPill={{ stepNumber: 4, majorLabel: "Skulder", subLabel: "Sammanfattning" }}
            title="Sammanfattning"
            subtitle="Vi kunde inte visa förhandsvisningen just nu."
            helpTitle="Du kan fortfarande fortsätta"
            helpItems={[
              "Slutför guiden ändå — allt kan justeras efteråt.",
              "Om du vill se siffrorna: gå tillbaka och försök igen.",
            ]}
          />
          <div className="text-center bg-white/5 p-4 rounded-lg text-sm text-white/70">
            Förhandsvisningen saknas. Du kan fortfarande gå vidare.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6 relative">
        <WizardStepHeader
          stepPill={{ stepNumber: 4, majorLabel: "Skulder", subLabel: "Sammanfattning" }}
          title=""
          subtitle="Här är en nulägesbild och ett enkelt val för hur du vill prioritera."
        />


        <DebtMinimumRealityCard monthly={vm.totalMonthlyPayments} money0={money0} />
        <DebtSnapshotCard totalBalance={vm.totalDebtBalance} avgApr={vm.avgApr} money0={money0} />

        <DebtStrategyPicker
          selected={repaymentStrategy}
          onSelect={(v) =>
            setValue("summary.repaymentStrategy", v as any, { shouldDirty: true, shouldValidate: false })
          }
          onContinue={onContinue}
          avalanche={{
            targetChip: vm.avalanche.targetLabel,
            heroOutcome: "Sparar mest ränta över tid.",
            heroDetail: vm.avalanche.estimateLine ?? "—",
            subtitle: "Extra pengar går till högst ränta först.",
            tip: "Bra när räntan skiljer mycket mellan skulder.",
          }}
          snowball={{
            targetChip: vm.snowball.targetLabel,
            heroOutcome: "Snabbaste första vinsten.",
            heroDetail: vm.snowball.estimateLine ?? "—",
            subtitle: "Extra pengar går till minsta skuld först.",
            tip: "Bra om du vill få momentum tidigt.",
            footnote: vm.snowball.footnote,
          }}
          error={errors.summary?.repaymentStrategy?.message as string | undefined}
        />

      </section>
    </div>
  );
}
