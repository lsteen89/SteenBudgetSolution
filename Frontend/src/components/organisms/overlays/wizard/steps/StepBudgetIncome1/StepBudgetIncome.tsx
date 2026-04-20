import { Coins } from "lucide-react";
import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import NumberInput from "@components/atoms/InputField/NumberInput";
import RowFrequencySelect from "@components/atoms/InputField/RowFrequencySelect";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import IncomePaymentTimingSection from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/IncomePaymentTimingSection";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { wizardIncomeDict } from "@/utils/i18n/wizard/stepIncome/StepIncome.i18n";

import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import { idFromPath } from "@/utils/idFromPath";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import type { IncomeFormValues } from "@/types/Wizard/Step1_Income/IncomeFormValues";
import type { Frequency } from "@/types/common";
import { safeMoney, sumMoney } from "@/utils/money/moneyMath";
import { toMonthly } from "@/utils/wizard/wizardHelpers";
import { WizardDecorationPulse } from "@components/atoms/feedback/DecorationPulse";
import { WizardTotalPulse } from "@components/atoms/feedback/WizardTotalPulse";
import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";
import { usePulseOnIncrease } from "@hooks/effects/usePulseOnIncrease";

import HouseholdMembersCard from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/HouseholdMembersCard";
import SideHustlesCard from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/SideHustlesCard";

const StepBudgetIncome: React.FC<{
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  stepNumber?: number;
}> = ({ loading }) => {
  const { control, register, formState, setValue, getFieldState } =
    useFormContext<IncomeFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardIncomeDict.sv>(k: K) =>
    tDict(k, locale, wizardIncomeDict);

  const FREQ_OPTIONS = useMemo<Array<{ value: Frequency; label: string }>>(
    () => [
      { value: "monthly", label: t("freqMonthly") },
      { value: "weekly", label: t("freqWeekly") },
      { value: "biWeekly", label: t("freqBiWeekly") },
      { value: "quarterly", label: t("freqQuarterly") },
      { value: "yearly", label: t("freqYearly") },
    ],
    [locale],
  );

  const netSalary = useWatch({ control, name: "netSalary" });
  const salaryFrequency = useWatch({ control, name: "salaryFrequency" });

  const household = useWatch({ control, name: "householdMembers" }) ?? [];
  const hustles = useWatch({ control, name: "sideHustles" }) ?? [];

  const freqState = getFieldState("salaryFrequency", formState);
  const showErrors = formState.submitCount > 0;

  const monthlyMain = useMemo(
    () => safeMoney(toMonthly(netSalary, salaryFrequency ?? "monthly")),
    [netSalary, salaryFrequency],
  );

  const monthlyHousehold = useMemo(() => {
    const monthlyValues = household.map((m) =>
      safeMoney(toMonthly(m?.income, m?.frequency ?? "monthly")),
    );
    return monthlyValues.reduce((acc, v) => acc + v, 0);
  }, [household]);

  const monthlyHustles = useMemo(() => {
    const monthlyValues = hustles.map((h) =>
      safeMoney(toMonthly(h?.income, h?.frequency ?? "monthly")),
    );
    return monthlyValues.reduce((acc, v) => acc + v, 0);
  }, [hustles]);

  const safeTotal = useMemo(
    () => sumMoney(monthlyMain, monthlyHousehold, monthlyHustles),
    [monthlyMain, monthlyHousehold, monthlyHustles],
  );

  const pulseKey = usePulseOnIncrease(safeTotal, {
    pulseOnMount: false,
    debounceMs: 450,
    cooldownMs: 900,
    minDelta: (t0) => Math.max(50, Math.round(t0 * 0.01)),
  });

  if (loading) {
    return <div className="p-6 text-white/70">{t("loading")}</div>;
  }

  return (
    <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-12 py-6 pb-safe">
      <WizardStepHeader
        stepPill={{
          stepNumber: 1,
          majorLabel: t("majorLabel"),
          subLabel: t("subLabel"),
        }}
        title=""
        subtitle={t("subtitle")}
        guardrails={[
          { emphasis: t("guard1Em"), to: t("guard1To") },
          { emphasis: t("guard2Em"), to: t("guard2To") },
        ]}
        helpTitle={t("helpTitle")}
        helpItems={[
          t("helpItem1"),
          t("helpItem2"),
          t("helpItem3"),
          t("helpItem4"),
        ]}
        decoration={
          <WizardDecorationPulse pulseKey={pulseKey}>
            <Coins className="h-12 w-12 text-darkLimeGreen/80 drop-shadow-[0_0_12px_rgba(163,230,53,0.22)]" />
          </WizardDecorationPulse>
        }
      />

      <div className="flex items-center justify-center gap-2 mb-4 text-white/80">
        <Coins className="w-5 h-5 text-darkLimeGreen" />
        <span className="font-semibold text-wizard-text">
          {t("mainIncomeTitle")}
        </span>
      </div>
      <div className="h-px w-full bg-white/10 mb-4" />

      <div className="grid grid-cols-1 gap-4">
        <NumberInput
          label={t("amountLabel")}
          currency={currency}
          locale={locale}
          placeholder={t("amountPlaceholder")}
          error={formState.errors.netSalary?.message}
          {...register("netSalary", { setValueAs: setValueAsLocalizedNumber })}
        />

        <div>
          <label className="text-sm font-semibold text-wizard-text/80">
            {t("salaryFrequencyLabel")}
          </label>

          <RowFrequencySelect
            id={idFromPath("salaryFrequency")}
            name="salaryFrequency"
            value={salaryFrequency ?? "monthly"}
            onChange={(v) => {
              if (v === "") return;
              setValue("salaryFrequency", v, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            options={FREQ_OPTIONS}
            error={
              freqState.isTouched || showErrors
                ? freqState.error?.message
                : undefined
            }
            touched={freqState.isTouched || showErrors}
          />
        </div>

        <IncomePaymentTimingSection />

        {monthlyMain > 0 && (
          <p className="text-center text-darkLimeGreen text-lg font-semibold mt-2">
            ≈{" "}
            {formatMoneyV2(monthlyMain, currency, locale, {
              fractionDigits: 2,
            })}{" "}
            {t("approxSuffix")}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4">
        <HouseholdMembersCard monthlyTotal={monthlyHousehold} />
        <SideHustlesCard monthlyTotal={monthlyHustles} />
      </div>

      <WizardTotalPulse pulseKey={pulseKey} className="block w-full">
        <WizardTotalBar
          title={t("totalTitle")}
          subtitle={t("totalSubtitle")}
          value={safeTotal}
          currency={currency}
          locale={locale}
          suffix={t("totalSuffix")}
          hideIfZero
          className="mt-6"
          tone="accent"
        />
      </WizardTotalPulse>
    </section>
  );
};

export default StepBudgetIncome;
