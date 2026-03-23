import type { CurrencyCode } from "@/utils/money/currency";
import React from "react";
import { Control, Controller } from "react-hook-form";

import { ExpenditureFormValues } from "@/types/Wizard/Step2_Expenditure/ExpenditureFormValues";
import { idFromPath } from "@/utils/idFromPath";

import WizardSelect from "@components/atoms/InputField/WizardSelect";
import { WizardAccordion } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import { Home } from "lucide-react";
import HomeTypeOption from "../components/HomeTypeOption";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { wizardHousingDict } from "@/utils/i18n/wizard/stepExpenditure/Housing.i18n";

type Props = {
  control: Control<ExpenditureFormValues>;
  homeType?: ExpenditureFormValues["housing"]["homeType"];

  baseCost: number;
  currency: CurrencyCode;
  locale: string;
  totalText?: string;
};

const HousingCostAccordion: React.FC<Props> = ({
  control,
  homeType,
  baseCost,
  currency,
  locale,
  totalText,
}) => {
  const appLocale = useAppLocale();
  const t = <K extends keyof typeof wizardHousingDict.sv>(k: K) =>
    tDict(k, appLocale, wizardHousingDict);

  return (
    <WizardAccordion
      value="housingMain"
      icon={<Home className="h-5 w-5 text-wizard-text" />}
      title={t("housingCostTitle")}
      subtitle={t("housingCostSubtitle")}
      meta={homeType ? `${t("homeTypeMetaPrefix")}${homeType}` : undefined}
      totalText={totalText}
      totalSuffix={t("perMonthSuffix")}
      variant="shell"
    >
      <div className="space-y-6">
        <Controller
          control={control}
          name="housing.homeType"
          render={({ field, fieldState }) => (
            <WizardSelect
              id={idFromPath(field.name)}
              name={field.name}
              label={t("homeTypeLabel")}
              ref={field.ref}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              options={[
                { value: "", label: t("homeTypePlaceholder"), disabled: true },
                { value: "rent", label: t("homeTypeRent") },
                { value: "brf", label: t("homeTypeBrf") },
                { value: "house", label: t("homeTypeHouse") },
                { value: "free", label: t("homeTypeFree") },
              ]}
            />
          )}
        />

        {homeType && homeType !== "free" && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <HomeTypeOption homeType={homeType} />
          </div>
        )}
      </div>
    </WizardAccordion>
  );
};

export default HousingCostAccordion;
