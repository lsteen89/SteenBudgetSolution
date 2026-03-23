import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { ExpenditureFormValues } from "@/types/Wizard/Step2_Expenditure/ExpenditureFormValues";
import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { WizardAccordion } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import { Droplets } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { tDict } from "@/utils/i18n/translate";
import { wizardHousingDict } from "@/utils/i18n/wizard/stepExpenditure/Housing.i18n";

type Props = {
  openValue: string;
  setOpenValue: (v: string) => void;
};

const RunningCosts: React.FC<Props> = ({ openValue, setOpenValue }) => {
  const { register, control, getFieldState, formState } =
    useFormContext<ExpenditureFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardHousingDict.sv>(k: K) =>
    tDict(k, locale, wizardHousingDict);

  const electricity = useWatch({
    control,
    name: "housing.runningCosts.electricity",
  });
  const heating = useWatch({ control, name: "housing.runningCosts.heating" });
  const water = useWatch({ control, name: "housing.runningCosts.water" });
  const waste = useWatch({ control, name: "housing.runningCosts.waste" });
  const other = useWatch({ control, name: "housing.runningCosts.other" });

  const safe = (v: number | null | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const total = useMemo(
    () =>
      safe(electricity) +
      safe(heating) +
      safe(water) +
      safe(waste) +
      safe(other),
    [electricity, heating, water, waste, other],
  );

  const totalText = useMemo(() => {
    if (openValue === "runningCosts" && total > 0) return undefined;
    return total > 0
      ? formatMoneyV2(total, currency, locale, { fractionDigits: 0 })
      : undefined;
  }, [openValue, total, currency, locale]);

  const err = (path: Parameters<typeof getFieldState>[0]) => {
    const st = getFieldState(path, formState);
    const show = st.isTouched || formState.submitCount > 0;
    return show ? st.error?.message : undefined;
  };

  useEffect(() => {
    if (formState.submitCount <= 0) return;

    const hasError =
      !!getFieldState("housing.runningCosts.electricity", formState).error ||
      !!getFieldState("housing.runningCosts.heating", formState).error ||
      !!getFieldState("housing.runningCosts.water", formState).error ||
      !!getFieldState("housing.runningCosts.waste", formState).error ||
      !!getFieldState("housing.runningCosts.other", formState).error;

    if (hasError) setOpenValue("runningCosts");
  }, [formState.submitCount, getFieldState, formState, setOpenValue]);

  return (
    <WizardAccordion
      value="runningCosts"
      icon={<Droplets className="h-5 w-5 text-wizard-text" />}
      title={t("runningCostsTitle")}
      subtitle={t("runningCostsSubtitle")}
      totalText={totalText}
      totalSuffix={t("perMonthSuffix")}
      variant="shell"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberInput
            label={t("electricity")}
            currency={currency}
            locale={locale}
            error={err("housing.runningCosts.electricity")}
            {...register("housing.runningCosts.electricity", {
              setValueAs: setValueAsLocalizedNumber,
            })}
          />

          <NumberInput
            label={t("heating")}
            currency={currency}
            locale={locale}
            error={err("housing.runningCosts.heating")}
            {...register("housing.runningCosts.heating", {
              setValueAs: setValueAsLocalizedNumber,
            })}
          />

          <NumberInput
            label={t("water")}
            currency={currency}
            locale={locale}
            error={err("housing.runningCosts.water")}
            {...register("housing.runningCosts.water", {
              setValueAs: setValueAsLocalizedNumber,
            })}
          />

          <NumberInput
            label={t("waste")}
            currency={currency}
            locale={locale}
            error={err("housing.runningCosts.waste")}
            {...register("housing.runningCosts.waste", {
              setValueAs: setValueAsLocalizedNumber,
            })}
          />

          <NumberInput
            label={t("other")}
            currency={currency}
            locale={locale}
            error={err("housing.runningCosts.other")}
            {...register("housing.runningCosts.other", {
              setValueAs: setValueAsLocalizedNumber,
            })}
          />
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-wizard-stroke bg-wizard-shell/70 px-4 py-3 shadow-sm shadow-black/10">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-wizard-text/70">
                {t("runningTotalTitle")}
              </p>
              <p className="text-sm text-wizard-text/65">
                {t("runningTotalSubtitle")}
              </p>
            </div>

            <p className="shrink-0 text-xl font-extrabold text-darkLimeGreen">
              {formatMoneyV2(total, currency, locale, { fractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>
    </WizardAccordion>
  );
};

export default RunningCosts;
