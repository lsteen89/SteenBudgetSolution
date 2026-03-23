import React, { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { ExpenditureFormValues } from "@/types/Wizard/Step2_Expenditure/ExpenditureFormValues";
import HousingCostAccordion from "./components/HousingCostAccordion";
import RunningCosts from "./components/RunningCosts";

import { WizardAccordionRoot } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { subStepHousingDict } from "@/utils/i18n/wizard/stepExpenditure/SubStepHousing.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import { sumMoney } from "@/utils/money/moneyMath";
import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";

const SubStepHousing: React.FC = () => {
  const { control } = useFormContext<ExpenditureFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof subStepHousingDict.sv>(k: K) =>
    tDict(k, locale, subStepHousingDict);

  const homeType = useWatch({ control, name: "housing.homeType" });

  const monthlyRent = useWatch({
    control,
    name: "housing.payment.monthlyRent",
  });
  const monthlyFee = useWatch({ control, name: "housing.payment.monthlyFee" });
  const extraFees = useWatch({ control, name: "housing.payment.extraFees" });

  const electricity = useWatch({
    control,
    name: "housing.runningCosts.electricity",
  });
  const heating = useWatch({ control, name: "housing.runningCosts.heating" });
  const water = useWatch({ control, name: "housing.runningCosts.water" });
  const waste = useWatch({ control, name: "housing.runningCosts.waste" });
  const other = useWatch({ control, name: "housing.runningCosts.other" });

  const baseCost = useMemo(() => {
    if (homeType === "rent") return sumMoney(monthlyRent, extraFees);
    if (homeType === "brf") return sumMoney(monthlyFee, extraFees);
    if (homeType === "house") return sumMoney(extraFees);
    return 0;
  }, [homeType, monthlyRent, monthlyFee, extraFees]);

  const housingTotal = useMemo(() => {
    const payment = sumMoney(monthlyRent, monthlyFee, extraFees);
    const running = sumMoney(electricity, heating, water, waste, other);
    return payment + running;
  }, [
    monthlyRent,
    monthlyFee,
    extraFees,
    electricity,
    heating,
    water,
    waste,
    other,
  ]);

  const HOUSING = "housingMain";
  const [open, setOpen] = useState<string>(HOUSING);
  const isHousingOpen = open === HOUSING;

  const baseCostText = useMemo(() => {
    return !isHousingOpen && baseCost > 0
      ? formatMoneyV2(baseCost, currency, locale, { fractionDigits: 0 })
      : undefined;
  }, [isHousingOpen, baseCost, currency, locale]);

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
          guardrails={[
            {
              emphasis: t("guardrailLoansEmphasis"),
              to: t("guardrailLoansTo"),
            },
            { emphasis: t("guardrailHereEmphasis"), to: t("guardrailHereTo") },
          ]}
          helpTitle={t("helpTitle")}
          helpItems={[t("helpItem1"), t("helpItem2")]}
        />

        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="space-y-6">
            <WizardAccordionRoot
              type="single"
              collapsible
              value={open}
              onValueChange={setOpen}
            >
              <div className="space-y-4">
                <HousingCostAccordion
                  control={control}
                  homeType={homeType}
                  baseCost={baseCost}
                  currency={currency}
                  locale={locale}
                  totalText={baseCostText}
                />

                {homeType && (
                  <RunningCosts openValue={open} setOpenValue={setOpen} />
                )}
              </div>
            </WizardAccordionRoot>

            {homeType && (
              <WizardTotalBar
                title={t("totalTitle")}
                subtitle={t("totalSubtitle")}
                value={housingTotal}
                currency={currency}
                locale={locale}
                suffix={t("totalSuffix")}
                tone="accent"
                subtitleClassName="hidden sm:block"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SubStepHousing;
