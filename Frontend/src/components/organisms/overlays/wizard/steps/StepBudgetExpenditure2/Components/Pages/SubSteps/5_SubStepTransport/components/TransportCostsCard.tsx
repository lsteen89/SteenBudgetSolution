import { Car } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import NumberInput from "@components/atoms/InputField/NumberInput";

import type { TransportFormShape } from "@/types/Wizard/Step2_Expenditure/TransportFormValues";
import { sumMoney } from "@/utils/money/moneyMath";
import { WizardCardAccordion } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardCardAccordion";

import { tDict } from "@/utils/i18n/translate";
import { transportCostsCardDict } from "@/utils/i18n/wizard/stepExpenditure/TransportCostsCard.i18n";

type FieldPath =
  | "transport.fuelOrCharging"
  | "transport.carInsurance"
  | "transport.parkingFee"
  | "transport.otherCarCosts"
  | "transport.publicTransit";

type FieldDef = {
  path: FieldPath;
  label: string;
  placeholder: string;
  helpText?: string;
};

export const TransportCostsCard: React.FC = () => {
  const { watch, register, getFieldState, formState } =
    useFormContext<TransportFormShape>();
  const [isOpen, setIsOpen] = useState(false);

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof transportCostsCardDict.sv>(k: K) =>
    tDict(k, locale, transportCostsCardDict);

  const v = watch("transport");

  const total = useMemo(() => {
    if (!v) return 0;
    return sumMoney(
      v.fuelOrCharging,
      v.carInsurance,
      v.parkingFee,
      v.otherCarCosts,
      v.publicTransit,
    );
  }, [v]);

  const err = (path: FieldPath) =>
    getFieldState(path, formState).error?.message;

  const totalText =
    !isOpen && total > 0
      ? formatMoneyV2(total, currency, locale, { fractionDigits: 0 })
      : undefined;

  const fields: FieldDef[] = useMemo(
    () => [
      {
        path: "transport.fuelOrCharging",
        label: t("fuelLabel"),
        placeholder: t("fuelPlaceholder"),
      },
      {
        path: "transport.carInsurance",
        label: t("insuranceLabel"),
        placeholder: t("insurancePlaceholder"),
      },
      {
        path: "transport.parkingFee",
        label: t("parkingLabel"),
        placeholder: t("parkingPlaceholder"),
        helpText: t("parkingHelp"),
      },
      {
        path: "transport.otherCarCosts",
        label: t("otherCarLabel"),
        placeholder: t("otherCarPlaceholder"),
        helpText: t("otherCarHelp"),
      },
      {
        path: "transport.publicTransit",
        label: t("transitLabel"),
        placeholder: t("transitPlaceholder"),
        helpText: t("transitHelp"),
      },
    ],
    [t],
  );

  return (
    <WizardCardAccordion
      title={t("title")}
      icon={<Car className="w-6 h-6 text-wizard-text flex-shrink-0" />}
      isOpen={isOpen}
      onToggle={() => setIsOpen((p) => !p)}
      totalText={totalText}
      totalSuffix={t("totalSuffix")}
    >
      <div className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <NumberInput
            key={field.path}
            label={field.label}
            currency={currency}
            locale={locale}
            placeholder={field.placeholder}
            error={err(field.path)}
            {...register(field.path, { setValueAs: setValueAsLocalizedNumber })}
          />
        ))}
      </div>
    </WizardCardAccordion>
  );
};
