import { useCallback, useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type {
  DebtsFormValues,
  RepaymentStrategy,
} from "@/types/Wizard/Step4_Debt/DebtFormValues";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { subStepConfirmDebtsDict } from "@/utils/i18n/wizard/stepDebt/SubStepConfirmDebts.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import { mapFinalizationPreviewToDebtsConfirm } from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Mapping/mapFinalizationPreviewToDebtsConfirm";

import DebtMinimumRealityCard from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Components/DebtMinimumRealityCard";
import DebtSnapshotCard from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Components/DebtSnapshotCard";
import DebtStrategyPicker from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/Components/DebtStrategyPicker";

type Props = { preview?: BudgetDashboardDto; onContinue?: () => void };

export default function SubStepConfirmDebts({ preview, onContinue }: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof subStepConfirmDebtsDict.sv>(k: K) =>
    tDict(k, locale, subStepConfirmDebtsDict);

  const money0 = useCallback(
    (v: number) =>
      formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<DebtsFormValues>();

  const repaymentStrategy = useWatch({
    control,
    name: "summary.repaymentStrategy",
  }) as RepaymentStrategy | undefined;

  const vm = useMemo(
    () => (preview ? mapFinalizationPreviewToDebtsConfirm(preview) : null),
    [preview],
  );

  useEffect(() => {
    if (!vm) return;
    if (repaymentStrategy) return;

    const strategy = vm.repaymentStrategy;
    if (strategy && strategy !== "unknown") {
      setValue("summary.repaymentStrategy", strategy, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [vm, repaymentStrategy, setValue]);

  const avalancheTargetChip = useMemo(() => {
    if (!vm?.avalanche.targetName || vm.avalanche.targetApr == null) {
      return t("none");
    }

    return t("targetChipAprTemplate")
      .replace("{name}", vm.avalanche.targetName)
      .replace("{apr}", vm.avalanche.targetApr.toFixed(1));
  }, [vm, t]);

  const avalancheHeroDetail = useMemo(() => {
    if (vm?.avalanche.monthlyInterestEstimate == null) return t("none");

    return t("avalancheEstimateTemplate").replace(
      "{amount}",
      money0(vm.avalanche.monthlyInterestEstimate),
    );
  }, [vm, t, money0]);

  const snowballTargetChip = useMemo(() => {
    if (!vm?.snowball.targetName || vm.snowball.targetBalance == null) {
      return t("none");
    }

    return t("targetChipBalanceTemplate")
      .replace("{name}", vm.snowball.targetName)
      .replace("{amount}", money0(vm.snowball.targetBalance));
  }, [vm, t, money0]);

  const snowballHeroDetail = useMemo(() => {
    if (vm?.snowball.payoffMonths == null) return t("none");

    return t("snowballEstimateTemplate").replace(
      "{months}",
      String(vm.snowball.payoffMonths),
    );
  }, [vm, t]);

  if (!preview || !vm) {
    return (
      <div className="p-4">
        <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6">
          <WizardStepHeader
            stepPill={{
              stepNumber: 4,
              majorLabel: t("pillMajor"),
              subLabel: t("pillSub"),
            }}
            title={t("titleSummary")}
            subtitle={t("subtitlePreviewMissing")}
            helpTitle={t("helpTitleContinue")}
            helpItems={[t("help1"), t("help2")]}
          />
          <div className="text-center bg-white/5 p-4 rounded-lg text-sm text-white/70">
            {t("previewMissingBox")}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6 relative">
        <WizardStepHeader
          stepPill={{
            stepNumber: 4,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title=""
          subtitle={t("subtitleMain")}
        />

        <DebtMinimumRealityCard
          monthly={vm.totalMonthlyPayments}
          money0={money0}
        />

        <DebtSnapshotCard
          totalBalance={vm.totalDebtBalance}
          avgApr={vm.avgApr}
          money0={money0}
        />

        <DebtStrategyPicker
          selected={repaymentStrategy}
          onSelect={(v) =>
            setValue("summary.repaymentStrategy", v, {
              shouldDirty: true,
              shouldValidate: false,
            })
          }
          onContinue={onContinue}
          avalanche={{
            targetChip: avalancheTargetChip,
            heroOutcome: t("avalancheHeroOutcome"),
            heroDetail: avalancheHeroDetail,
            subtitle: t("avalancheSubtitle"),
            tip: t("avalancheTip"),
          }}
          snowball={{
            targetChip: snowballTargetChip,
            heroOutcome: t("snowballHeroOutcome"),
            heroDetail: snowballHeroDetail,
            subtitle: t("snowballSubtitle"),
            tip: t("snowballTip"),
            footnote: t("snowballFootnote"),
          }}
          error={
            errors.summary?.repaymentStrategy?.message as string | undefined
          }
        />
      </section>
    </div>
  );
}
