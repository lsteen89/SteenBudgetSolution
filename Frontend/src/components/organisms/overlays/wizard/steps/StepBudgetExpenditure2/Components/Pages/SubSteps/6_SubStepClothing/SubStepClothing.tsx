import { Shirt } from "lucide-react";
import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Separator } from "@/components/ui/separator";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import { tDict } from "@/utils/i18n/translate";
import { subStepClothingDict } from "@/utils/i18n/wizard/stepExpenditure/SubStepClothing.i18n";
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
  const t = <K extends keyof typeof subStepClothingDict.sv>(k: K) =>
    tDict(k, locale, subStepClothingDict);

  const path = "clothing.monthlyClothingCost" as const;
  const cost = useWatch({ control, name: path });

  const total = useMemo(() => sumMoney(cost), [cost]);

  const costErr = getFieldState(path, formState).error?.message;

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <WizardStepHeader
          stepPill={{
            stepNumber: 2,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title=""
          subtitle={t("subtitle")}
          helpTitle={t("helpTitle")}
          helpItems={[t("help1"), t("help2"), t("help3")]}
        />

        <div className="rounded-2xl bg-white/[0.06] border border-white/10 shadow-lg p-6 space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-center gap-2 text-wizard-text/80 font-semibold">
              <Shirt className="h-5 w-5 text-wizard-text/80" />
              <span>{t("cardTitle")}</span>
            </div>

            <NumberInput
              placeholder={t("placeholder")}
              currency={currency}
              locale={locale}
              error={costErr}
              {...register(path, { setValueAs: setValueAsLocalizedNumber })}
            />
          </div>

          <Separator className="bg-white/15" />

          <WizardTotalBar
            title={t("totalTitle")}
            subtitle={t("totalSubtitle")}
            value={total}
            currency={currency}
            locale={locale}
            suffix={t("totalSuffix")}
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
