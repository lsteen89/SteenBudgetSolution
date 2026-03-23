import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { WizardStepHeader } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import SavingsHabitsCard, {
  type SavingsMethodOption,
} from "@/components/organisms/overlays/wizard/steps/StepBudgetSavings3/Components/Pages/SubSteps/3_SubStepGoals/components/SavingsHabitsCard";
import SavingsMilestoneCard from "@/components/organisms/overlays/wizard/steps/StepBudgetSavings3/Components/Pages/SubSteps/3_SubStepGoals/components/SavingsMilestoneCard";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { SAVING_METHODS } from "@/types/Wizard/Step3_Savings/SavingsFormValues";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { tDict } from "@/utils/i18n/translate";
import { subStepHabitsDict } from "@/utils/i18n/wizard/stepSavings/SubStepHabits.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";

type SavingMethod = (typeof SAVING_METHODS)[number];

const SubStepHabits: React.FC = () => {
  const { control } = useFormContext<Step3FormValues>();

  const locale = useAppLocale();
  const currency = useAppCurrency();
  const income = useWizardDataStore((s) => s.data.income);
  const maxIncome = useMemo(() => calcMonthlyIncome(income), [income]);

  const t = <K extends keyof typeof subStepHabitsDict.sv>(k: K) =>
    tDict(k, locale, subStepHabitsDict);

  const sliderSoftMax = useMemo(
    () => Math.max(1000, Math.round(maxIncome * 0.7)),
    [maxIncome],
  );
  const inputHardMax = 1_000_000;

  const step = 100;
  const recommendedSavings = useMemo(() => {
    const raw = maxIncome * 0.2;
    return Math.round(raw / step) * step;
  }, [maxIncome]);

  const money0 = React.useCallback(
    (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const help3 = t("help3Template").replace(
    "{amount}",
    money0(recommendedSavings),
  );

  const options: SavingsMethodOption<SavingMethod>[] = [
    { value: "auto", label: t("optionAuto") },
    { value: "manual", label: t("optionManual") },
    { value: "invest", label: t("optionInvest") },
    { value: "prefer_not", label: t("optionPreferNot") },
  ];

  const monthlySavingsRaw = useWatch({
    control,
    name: "habits.monthlySavings",
  });
  const monthlySavingsNum =
    typeof monthlySavingsRaw === "number" && Number.isFinite(monthlySavingsRaw)
      ? monthlySavingsRaw
      : 0;

  const overSoftCap = monthlySavingsNum > sliderSoftMax;

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
          helpItems={[t("help1"), t("help2"), help3]}
        />

        <SavingsHabitsCard<SavingMethod>
          idBasePath="habits"
          sliderSoftMax={sliderSoftMax}
          inputHardMax={inputHardMax}
          options={options}
          monthlyIncome={maxIncome}
          sliderHint={
            overSoftCap ? (
              <p className="text-xs text-wizard-text/55">
                {t("sliderHintHigh")}
              </p>
            ) : (
              <p className="text-xs text-wizard-text/45">
                {t("sliderHintNormal")}
              </p>
            )
          }
          markers={[
            {
              value: recommendedSavings,
              label: t("markerRecommended"),
              className: "bg-sky-400/80",
            },
          ]}
        />

        <SavingsMilestoneCard
          monthlySavings={monthlySavingsNum}
          monthlyIncome={maxIncome}
        />
      </section>
    </div>
  );
};

export default SubStepHabits;
