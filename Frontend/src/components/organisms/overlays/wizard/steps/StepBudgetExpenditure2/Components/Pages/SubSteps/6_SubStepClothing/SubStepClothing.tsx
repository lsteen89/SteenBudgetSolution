import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Shirt } from "lucide-react";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { Separator } from "@/components/ui/separator";

import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { sumMoney } from "@/utils/money/moneyMath";
import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";

type ClothingForm = {
  clothing: {
    monthlyClothingCost: number | null;
  };
};

const SubStepClothing: React.FC = () => {
  const { control, register, getFieldState, formState } =
    useFormContext<ClothingForm>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const path = "clothing.monthlyClothingCost" as const;
  const cost = useWatch({ control, name: path });

  const total = useMemo(() => sumMoney(cost), [cost]);

  const costErr = getFieldState(path, formState).error?.message;

  return (
    <div >
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <WizardStepHeader
          stepPill={{ stepNumber: 2, majorLabel: "Utgifter", subLabel: "Kläder" }}
          title=""
          subtitle="Uppskatta vad du spenderar på kläder per månad. Ta gärna ett snitt på tre månader."
          helpTitle="Tips för en bättre siffra"
          helpItems={[
            "Ta senaste **2–3 månaderna** och räkna snitt.",
            "Om du gör stora inköp ibland: välj en **normalmånad**.",
            "Barn kan göra detta mer säsongsberoende – välj ett rimligt genomsnitt.",
          ]}
        />

        <div className="rounded-2xl bg-white/[0.06] border border-white/10 shadow-lg p-6 space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-center gap-2 text-wizard-text/80 font-semibold">
              <Shirt className="h-5 w-5 text-wizard-text/80" />
              <span>Kläder</span>
            </div>

            <NumberInput
              placeholder="t.ex. 500"
              currency={currency}
              locale={locale}
              error={costErr}
              {...register(path, { setValueAs: setValueAsSvNumber })}
            />
          </div>

          <Separator className="bg-white/15" />

          <WizardTotalBar
            title="Totalt kläder"
            subtitle="Summa för kläder per månad"
            value={total}
            currency={currency}
            locale={locale}
            suffix="/mån"
            hideIfZero
            subtitleClassName="hidden sm:block"
            tone="accent"
          />
        </div>
      </section>
    </div>
  );
};

export default SubStepClothing;
