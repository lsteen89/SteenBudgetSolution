import React, { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Car } from "lucide-react";

import NumberInput from "@components/atoms/InputField/NumberInput";
import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import type { TransportFormShape } from "@/types/Wizard/Step2_Expenditure/TransportFormValues";
import { WizardCardAccordion } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardCardAccordion";
import { sumMoney } from "@/utils/money/moneyMath";

type FieldPath =
  | "transport.fuelOrCharging"
  | "transport.carInsurance"
  | "transport.parkingFee"
  | "transport.otherCarCosts"
  | "transport.publicTransit";

const FIELDS: Array<{
  path: FieldPath;
  label: string;
  placeholder: string;
  helpText?: string;
}> = [
    { path: "transport.fuelOrCharging", label: "Bränsle / laddning", placeholder: "t.ex. 1 500" },
    { path: "transport.carInsurance", label: "Bilförsäkring", placeholder: "t.ex. 500" },
    {
      path: "transport.parkingFee",
      label: "Parkering",
      placeholder: "t.ex. 900",
      helpText: "P-plats/garage och återkommande parkeringsavgifter.",
    },
    {
      path: "transport.otherCarCosts",
      label: "Övriga bilkostnader",
      placeholder: "t.ex. 600",
      helpText: "Service/underhåll, trängselskatt, vägtullar och liknande.",
    },
    {
      path: "transport.publicTransit",
      label: "Kollektivtrafik",
      placeholder: "t.ex. 990",
      helpText: "SL/Västtrafik/periodkort och återkommande resor.",
    },
  ];

const sum = (n?: number | null) => (typeof n === "number" && !Number.isNaN(n) ? n : 0);

export const TransportCostsCard: React.FC = () => {
  const { watch, register, getFieldState, formState } = useFormContext<TransportFormShape>();
  const [isOpen, setIsOpen] = useState(false);

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const v = watch("transport");

  const total = useMemo(() => {
    if (!v) return 0;

    return sumMoney(
      v.fuelOrCharging,
      v.carInsurance,
      v.parkingFee,
      v.otherCarCosts,
      v.publicTransit
    );
  }, [v]);


  const err = (path: FieldPath) => getFieldState(path, formState).error?.message;

  const totalText =
    !isOpen && total > 0 ? formatMoneyV2(total, currency, locale, { fractionDigits: 0 }) : undefined;

  return (
    <WizardCardAccordion
      title="Transport"
      icon={<Car className="w-6 h-6 text-wizard-text flex-shrink-0" />}
      isOpen={isOpen}
      onToggle={() => setIsOpen((p) => !p)}
      totalText={totalText}
      totalSuffix="/mån"
    >
      <div className="grid grid-cols-1 gap-4">
        {FIELDS.map((field) => (
          <NumberInput
            key={field.path}
            label={field.label}
            currency={currency}
            locale={locale}
            placeholder={field.placeholder}
            error={err(field.path)}
            {...register(field.path, { setValueAs: setValueAsSvNumber })}
          />
        ))}
      </div>
    </WizardCardAccordion>
  );
};
