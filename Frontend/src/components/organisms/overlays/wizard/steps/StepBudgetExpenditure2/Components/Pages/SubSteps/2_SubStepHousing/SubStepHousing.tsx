import React, { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import OptionContainer from "@/components/molecules/containers/OptionContainer";
import { ExpenditureFormValues } from "@/types/Wizard/Step2_Expenditure/ExpenditureFormValues";

import RunningCosts from "./components/RunningCosts";
import HousingCostAccordion from "./components/HousingCostAccordion";

import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { WizardAccordionRoot } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";

import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";

import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";
import { sumMoney } from "@/utils/money/moneyMath";


const SubStepHousing: React.FC = () => {
  const { control } = useFormContext<ExpenditureFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();



  const homeType = useWatch({ control, name: "housing.homeType" });

  const monthlyRent = useWatch({ control, name: "housing.payment.monthlyRent" });
  const monthlyFee = useWatch({ control, name: "housing.payment.monthlyFee" });
  const extraFees = useWatch({ control, name: "housing.payment.extraFees" });

  const electricity = useWatch({ control, name: "housing.runningCosts.electricity" });
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

  const baseCostText = useMemo(() => {
    return baseCost > 0
      ? formatMoneyV2(baseCost, currency, locale, { fractionDigits: 0 })
      : undefined;
  }, [baseCost, currency, locale]);

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

  const totalText = useMemo(() => {
    return !isHousingOpen && housingTotal > 0
      ? formatMoneyV2(housingTotal, currency, locale, { fractionDigits: 0 })
      : undefined;
  }, [isHousingOpen, housingTotal, currency, locale]);

  return (
    <div >
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <WizardStepHeader
          stepPill={{ stepNumber: 2, majorLabel: "Utgifter", subLabel: "Boende" }}
          title=""
          subtitle="Välj boendetyp och fyll i boendekostnader. Lån kommer senare."
          guardrails={[
            { emphasis: "Bolån & andra lån", to: "Skulder" },
            { emphasis: "Här fyller du i", to: "boendekostnader + drift" },
          ]}
          helpTitle="Tips"
          helpItems={[
            "Hyresrätt: hyra. Bostadsrätt: månadsavgift + ev. extra avgifter.",
            "Driftkostnader: el, värme, vatten/avlopp, sopor (det som gäller dig).",
          ]}
        />

        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="space-y-6">
            <WizardAccordionRoot
              type="single"
              collapsible
              value={open}
              onValueChange={setOpen}
            >
              {/* add spacing BETWEEN accordion items */}
              <div className="space-y-4">
                <HousingCostAccordion
                  control={control}
                  homeType={homeType}
                  baseCost={baseCost}
                  currency={currency}
                  locale={locale}
                  totalText={totalText}
                />

                {homeType && (
                  <RunningCosts openValue={open} setOpenValue={setOpen} />
                )}
              </div>
            </WizardAccordionRoot>
            {homeType && (
              <WizardTotalBar
                title="Totalt boende"
                subtitle="Summa för boendekostnad + drift per månad"
                value={housingTotal}
                currency={currency}
                locale={locale}
                suffix="/mån"
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
