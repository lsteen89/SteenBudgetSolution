import React, { useEffect, useMemo, useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import CheckboxOption from "@/components/atoms/InputField/CheckboxOption";
import EditableSavingsInput from "@/components/molecules/InputField/EditableSavingsInput";
import InfoBox from "@/components/molecules/messaging/InfoBox";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import { idFromPath } from "@/utils/idFromPath";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { savingsHabitsCardDict } from "@/utils/i18n/wizard/stepSavings/SavingsHabitsCard.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import {
  WizardAccordion,
  WizardAccordionRoot,
} from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";

export type SavingsMethodOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<TMethod extends string> = {
  idBasePath: string;
  sliderSoftMax: number;
  inputHardMax?: number;
  options: Array<SavingsMethodOption<TMethod>>;
  sliderHint?: React.ReactNode;
  monthlyIncome?: number;
  markers?: { value: number; label?: string; className?: string }[];
  showMethods?: boolean;
  methodsDefaultCollapsed?: boolean;
  monthlyLabel?: string;
  methodsLabel?: string;
};

export default function SavingsHabitsCard<TMethod extends string>({
  idBasePath,
  sliderSoftMax,
  inputHardMax,
  options,
  monthlyLabel,
  methodsLabel,
  sliderHint,
  monthlyIncome,
  markers,
  showMethods,
  methodsDefaultCollapsed,
}: Props<TMethod>) {
  const { control } = useFormContext<Step3FormValues>();

  const locale = useAppLocale();
  const currency = useAppCurrency();

  const t = <K extends keyof typeof savingsHabitsCardDict.sv>(k: K) =>
    tDict(k, locale, savingsHabitsCardDict);

  const monthlyLabelText = monthlyLabel ?? t("monthlyLabel");
  const methodsLabelText = methodsLabel ?? t("methodsLabel");

  const monthly = useController({
    control,
    name: "habits.monthlySavings",
  });

  const methods = useController({
    control,
    name: "habits.savingMethods",
  });

  const monthlySavings = (monthly.field.value ?? null) as number | null;
  const savingMethods = (methods.field.value ?? []) as TMethod[];

  const monthlySavingsError = monthly.fieldState.error?.message;
  const savingMethodsError = methods.fieldState.error?.message;

  const money0 = React.useCallback(
    (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const savingsRate =
    monthlyIncome && monthlyIncome > 0
      ? (monthlySavings ?? 0) / monthlyIncome
      : null;

  const pct =
    savingsRate !== null ? Math.min(999, Math.round(savingsRate * 100)) : null;
  const pctLabel =
    pct !== null ? `${pct}${t("percentOfIncomeSuffix")}` : undefined;

  const monthlyId = idFromPath(`${idBasePath}.monthlySavings`);
  const monthlyLabelId = `${monthlyId}-label`;

  const methodsBaseId = idFromPath(`${idBasePath}.savingMethods`);
  const showMethodsSection = showMethods ?? true;

  const selectedSummary = useMemo(() => {
    if (!savingMethods?.length) return t("summaryNotSpecified");
    if ((savingMethods as string[]).includes("preferNot"))
      return t("summaryPreferNot");
    if (savingMethods.length === 1) return t("summaryOneSelected");
    return t("summaryManySelected").replace(
      "{count}",
      String(savingMethods.length),
    );
  }, [savingMethods, t]);

  console.log("SavingsHabitsCard render", {
    monthlySavings,
    savingMethods,
    monthlySavingsError,
    savingMethodsError,
  });

  const [methodsOpen, setMethodsOpen] = useState<string>(
    methodsDefaultCollapsed ? "" : "",
  );
  const autoOpenedRef = useRef(false);

  const shouldAutoOpen = (showMethods ?? true) && (monthlySavings ?? 0) > 0;

  useEffect(() => {
    if (!shouldAutoOpen) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    setMethodsOpen("methods");
  }, [shouldAutoOpen]);

  const toggleMethod = (value: TMethod) => {
    const current = Array.isArray(savingMethods) ? [...savingMethods] : [];
    if (value === ("preferNot" as TMethod)) {
      const next = current.includes("preferNot" as TMethod)
        ? []
        : ["preferNot" as TMethod];
      methods.field.onChange(next);
      return;
    }

    const filtered = current.filter((v) => v !== ("preferNot" as TMethod));
    const idx = filtered.indexOf(value);
    const next =
      idx > -1 ? filtered.filter((v) => v !== value) : [...filtered, value];

    methods.field.onChange(next);
  };

  return (
    <WizardCard>
      <div className="space-y-6">
        <div className="text-center">
          <label
            id={monthlyLabelId}
            className="block text-sm font-medium text-wizard-text/70 mb-3"
          >
            {monthlyLabelText}
          </label>

          <EditableSavingsInput
            id={monthlyId}
            value={monthlySavings}
            softMax={sliderSoftMax}
            hardMax={inputHardMax}
            formatValue={money0}
            onChange={(v) => {
              monthly.field.onChange(v);

              if ((v ?? 0) <= 0 && (savingMethods?.length ?? 0) > 0) {
                methods.field.onChange([]);
              }
            }}
            onBlur={monthly.field.onBlur}
            ariaLabelledBy={monthlyLabelId}
            markers={markers}
            sliderValueLabel={pctLabel}
          />

          {sliderHint ? <div className="mt-1">{sliderHint}</div> : null}

          <div className="mt-2 min-h-[20px]">
            {monthlySavingsError ? (
              <p
                className="text-sm font-semibold text-wizard-warning"
                role="alert"
              >
                {monthlySavingsError}
              </p>
            ) : null}
          </div>
        </div>

        {showMethodsSection && (
          <div className="relative">
            <WizardAccordionRoot
              type="single"
              collapsible
              value={methodsOpen}
              onValueChange={(v) => setMethodsOpen(v)}
            >
              <WizardAccordion
                value="methods"
                variant="shell"
                title={
                  <div className="flex items-baseline gap-2">
                    <span className="text-wizard-text font-semibold">
                      {methodsLabelText}
                    </span>
                    <span className="text-wizard-text/45 font-normal text-sm">
                      {t("methodsOptional")}
                    </span>
                  </div>
                }
                subtitle={
                  <span className="text-sm text-wizard-text/65">
                    {(monthlySavings ?? 0) > 0
                      ? t("subtitleWithSavings")
                      : t("subtitleWithoutSavings")}
                  </span>
                }
                totalText={selectedSummary}
                totalSuffix=""
                isActive={methodsOpen === "methods"}
              >
                <div
                  className="space-y-3"
                  role="group"
                  aria-label={t("methodsAriaLabel")}
                >
                  {options.map((o) => (
                    <CheckboxOption
                      key={o.value}
                      id={`${methodsBaseId}-${o.value}`}
                      label={o.label}
                      value={o.value}
                      checked={savingMethods.includes(o.value)}
                      onChange={() => toggleMethod(o.value)}
                    />
                  ))}
                </div>

                {savingMethodsError ? (
                  <p
                    className="mt-2 text-sm font-semibold text-wizard-warning"
                    role="alert"
                  >
                    {savingMethodsError}
                  </p>
                ) : null}

                <div className="mt-3">
                  <InfoBox>{t("infoBox")}</InfoBox>
                </div>
              </WizardAccordion>
            </WizardAccordionRoot>
          </div>
        )}
      </div>
    </WizardCard>
  );
}
