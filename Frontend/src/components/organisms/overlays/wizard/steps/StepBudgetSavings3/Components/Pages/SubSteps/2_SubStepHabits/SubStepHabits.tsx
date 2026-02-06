import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import OptionContainer from "@/components/molecules/containers/OptionContainer";
import { WizardStepHeader } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";
import SavingsHabitsCard, { type SavingsMethodOption } from "@/components/organisms/overlays/wizard/steps/StepBudgetSavings3/Components/Pages/SubSteps/3_SubStepGoals/components/SavingsHabitsCard";
import SavingsMilestoneCard from "@/components/organisms/overlays/wizard/steps/StepBudgetSavings3/Components/Pages/SubSteps/3_SubStepGoals/components/SavingsMilestoneCard";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { SAVING_METHODS } from "@/types/Wizard/Step3_Savings/SavingsFormValues";

type SavingMethod = (typeof SAVING_METHODS)[number];

const OPTIONS: SavingsMethodOption<SavingMethod>[] = [
  { value: "auto", label: "Automatiska överföringar" },
  { value: "manual", label: "Manuella överföringar" },
  { value: "invest", label: "Investeringar (fonder, aktier, etc.)" },
  { value: "prefer_not", label: "Vill inte ange" },
];

const SubStepHabits: React.FC = () => {
  const { control } = useFormContext<Step3FormValues>();

  const locale = useAppLocale();
  const currency = useAppCurrency();
  const income = useWizardDataStore((s) => s.data.income);
  const maxIncome = useMemo(() => calcMonthlyIncome(income), [income]);

  const sliderSoftMax = useMemo(() => Math.max(1000, Math.round(maxIncome * 0.7)), [maxIncome]);
  const inputHardMax = 1_000_000;

  const step = 100;
  const recommendedSavings = useMemo(() => {
    const raw = maxIncome * 0.2;
    return Math.round(raw / step) * step;
  }, [maxIncome]);

  const money0 = React.useCallback(
    (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale]
  );

  // only needed for milestone card (read-only)
  const monthlySavingsRaw = useWatch({ control, name: "habits.monthlySavings" });
  const monthlySavingsNum =
    typeof monthlySavingsRaw === "number" && Number.isFinite(monthlySavingsRaw) ? monthlySavingsRaw : 0;

  const overSoftCap = monthlySavingsNum > sliderSoftMax;

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-8">
        <WizardStepHeader
          title=""
          stepPill={{ stepNumber: 3, majorLabel: "Sparande", subLabel: "Sparvanor" }}
          subtitle="Vi använder detta för att ge smartare förslag och göra dina mål mer realistiska."
          helpTitle="Kom ihåg"
          helpItems={[
            "Det här är bara en startpunkt — du kan alltid ändra senare.",
            "**Vill du inte svara?** Välj “Vill inte ange”.",
            `Här blir **20% ≈ ${money0(recommendedSavings)}** per månad.`,
          ]}
        />

        <SavingsHabitsCard<SavingMethod>
          idBasePath="habits"
          sliderSoftMax={sliderSoftMax}
          inputHardMax={inputHardMax}
          options={OPTIONS}
          monthlyIncome={maxIncome}
          sliderHint={
            overSoftCap ? (
              <p className="text-xs text-wizard-text/55">
                Det är en hög nivå jämfört med inkomsten — dubbelkolla att det stämmer.
              </p>
            ) : (
              <p className="text-xs text-wizard-text/45">Markeringen 20% är en tumregel – inte ett krav.</p>
            )
          }
          markers={[
            { value: recommendedSavings, label: "Rek: 20% av inkomsten", className: "bg-sky-400/80" },
          ]}
        />

        <SavingsMilestoneCard monthlySavings={monthlySavingsNum} monthlyIncome={maxIncome} />
      </section>
    </div>
  );
};

export default SubStepHabits;
