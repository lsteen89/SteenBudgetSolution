// StepBudgetIncome.tsx
import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Coins } from "lucide-react";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import NumberInput from "@components/atoms/InputField/NumberInput";
import RowFrequencySelect from "@components/atoms/InputField/RowFrequencySelect";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { idFromPath } from "@/utils/idFromPath";

import type { IncomeFormValues } from "@/types/Wizard/Step1_Income/IncomeFormValues";
import type { Frequency } from "@/types/common";
import { toMonthly, sumArray } from "@/utils/wizard/wizardHelpers";
import { usePulseOnIncrease } from "@hooks/effects/usePulseOnIncrease";
import { WizardDecorationPulse } from "@components/atoms/feedback/DecorationPulse";
import { WizardTotalPulse } from "@components/atoms/feedback/WizardTotalPulse";
import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";
import { sumMoney, safeMoney } from "@/utils/money/moneyMath";

import HouseholdMembersCard from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/HouseholdMembersCard";
import SideHustlesCard from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/SideHustlesCard";

const FREQ_OPTIONS: Array<{ value: Frequency; label: string }> = [
  { value: "monthly", label: "Per månad" },
  { value: "weekly", label: "Per vecka" },
  { value: "biWeekly", label: "Varannan vecka" },
  { value: "quarterly", label: "Per kvartal" },
  { value: "yearly", label: "Årligen" },
];

const StepBudgetIncome: React.FC<{
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  stepNumber?: number;
}> = ({ loading }) => {
  const { control, register, watch, formState, setValue, getFieldState } =
    useFormContext<IncomeFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const netSalary = useWatch({ control, name: "netSalary" });
  const salaryFrequency = useWatch({ control, name: "salaryFrequency" });

  const household = useWatch({ control, name: "householdMembers" }) ?? [];
  const hustles = useWatch({ control, name: "sideHustles" }) ?? [];

  const freqState = getFieldState("salaryFrequency", formState);
  const showErrors = formState.submitCount > 0;



  const monthlyMain = useMemo(() => {
    return safeMoney(toMonthly(netSalary, salaryFrequency ?? "monthly"));
  }, [netSalary, salaryFrequency]);

  const monthlyHousehold = useMemo(() => {
    const monthlyValues = household.map((m) =>
      safeMoney(toMonthly(m?.income, m?.frequency ?? "monthly"))
    );
    return monthlyValues.reduce((acc, v) => acc + v, 0);
  }, [household]);

  const monthlyHustles = useMemo(() => {
    const monthlyValues = hustles.map((h) =>
      safeMoney(toMonthly(h?.income, h?.frequency ?? "monthly"))
    );
    return monthlyValues.reduce((acc, v) => acc + v, 0);
  }, [hustles]);

  const safeTotal = useMemo(() => {
    return sumMoney(monthlyMain, monthlyHousehold, monthlyHustles);
  }, [monthlyMain, monthlyHousehold, monthlyHustles]);

  const pulseKey = usePulseOnIncrease(safeTotal, {
    pulseOnMount: false,
    debounceMs: 450,
    cooldownMs: 900,
    minDelta: (t) => Math.max(50, Math.round(t * 0.01)),
  });

  if (loading) {
    // Keep it simple; if you want parity later, use the same overlay skeleton style.
    return <div className="p-6 text-white/70">Loading…</div>;
  }
  console.log("monthlyTotal:", safeTotal, "pulseKey:", pulseKey);
  return (

    <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-12 py-6 pb-safe">
      <WizardStepHeader
        stepPill={{ stepNumber: 1, majorLabel: "Inkomster", subLabel: "Inkomster" }}
        title=""
        subtitle="Ange din huvudinkomst. Lägg till andra inkomster om du vill."
        guardrails={[
          { emphasis: "Skatter & bruttolön", to: "är inte nödvändigt här" },
          { emphasis: "Här fyller du i", to: "netto och frekvens" },
        ]}
        helpTitle="Vad räknas som inkomst?"
        helpItems={[
          "Lön (netto)",
          "A-kassa, sjukpenning, pension",
          "Bidrag och stöd",
          "Sidoinkomster / frilans",
        ]}
        decoration={
          <WizardDecorationPulse pulseKey={pulseKey}>
            <Coins className="h-12 w-12 text-darkLimeGreen/80 drop-shadow-[0_0_12px_rgba(163,230,53,0.22)]" />
          </WizardDecorationPulse>
        }
      />


      {/* Main income */}
      <div className="flex items-center justify-center gap-2 mb-4 text-white/80">
        <Coins className="w-5 h-5 text-darkLimeGreen" />
        <span className="font-semibold text-wizard-text">Huvudinkomst</span>
      </div>
      <div className="h-px w-full bg-white/10 mb-4" />

      <div className="grid grid-cols-1 gap-4">
        <NumberInput
          label="Belopp"
          currency={currency}
          locale={locale}
          placeholder="t.ex. 30 000"
          error={formState.errors.netSalary?.message}
          {...register("netSalary", { setValueAs: setValueAsSvNumber })}
        />

        <div>
          <label className="text-sm font-semibold text-wizard-text/80">Lönefrekvens</label>
          <RowFrequencySelect
            id={idFromPath("salaryFrequency")}
            name="salaryFrequency"
            value={salaryFrequency ?? "monthly"}
            onChange={(v) => {
              if (v === "") return;
              setValue("salaryFrequency", v, { shouldDirty: true, shouldValidate: true });
            }}
            options={FREQ_OPTIONS}
            error={(freqState.isTouched || showErrors) ? freqState.error?.message : undefined}
            touched={freqState.isTouched || showErrors}
          />
        </div>

        {monthlyMain > 0 && (
          <p className="text-center text-darkLimeGreen text-lg font-semibold mt-2">
            ≈ {formatMoneyV2(monthlyMain, currency, locale, { fractionDigits: 0 })} / mån
          </p>
        )}
      </div>

      {/* Optional incomes */}
      <div className="mt-6 grid gap-4">
        <HouseholdMembersCard monthlyTotal={monthlyHousehold} />
        <SideHustlesCard monthlyTotal={monthlyHustles} />
      </div>

      {/* Total */}
      <WizardTotalPulse pulseKey={pulseKey} className="block w-full">
        <WizardTotalBar
          title="Total månadsinkomst"
          subtitle="Summa av lön + hushåll + sidoinkomster"
          value={safeTotal}
          currency={currency}
          locale={locale}
          suffix="/mån"
          hideIfZero
          className="mt-6"
          tone="accent"
        />
      </WizardTotalPulse>
    </section>

  );
};

export default StepBudgetIncome;
