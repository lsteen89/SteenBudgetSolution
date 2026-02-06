import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { MdLocalGroceryStore } from "react-icons/md";
import { FaHamburger } from "react-icons/fa";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { Separator } from "@/components/ui/separator";

import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { sumMoney } from "@/utils/money/moneyMath";

import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import foodBird from "@/assets/Images/FoodDeliveryBird.png";

import { useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useWizardNavEvents } from "@/components/organisms/overlays/wizard/SharedComponents/Nav/WizardNavEvents";


type FoodForm = {
  food: {
    foodStoreExpenses: number | null;
    takeoutExpenses: number | null;
  };
};

const SubStepFood: React.FC = () => {
  const { control, register, getFieldState, formState } = useFormContext<FoodForm>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const nav = useWizardNavEvents();

  useEffect(() => {
    console.log("[Food] subscribe");
    const off1 = nav.subscribe("nextHoverStart", () => {
      console.log("[Food] hover start");
      if (reduce) return;
      controls.start({ x: 10, rotate: 1, transition: { duration: 0.18 } });
    });

    const off2 = nav.subscribe("nextHoverEnd", () => {
      console.log("[Food] hover end");
      if (reduce) return;
      controls.start({ x: 0, rotate: 0, transition: { duration: 0.18 } });
    });

    const off3 = nav.subscribe("nextClick", () => {
      console.log("[Food] click");
      if (reduce) return;
      controls.start({ x: 220, rotate: 6, transition: { duration: 0.32 } });
    });

    return () => { off1(); off2(); off3(); };
  }, [nav, controls, reduce]);

  const storePath = "food.foodStoreExpenses" as const;
  const takeoutPath = "food.takeoutExpenses" as const;

  const store = useWatch({ control, name: storePath });
  const takeout = useWatch({ control, name: takeoutPath });

  const total = useMemo(() => sumMoney(store, takeout), [store, takeout]);

  const storeErr = getFieldState(storePath, formState).error?.message;
  const takeoutErr = getFieldState(takeoutPath, formState).error?.message;

  return (

    <div className="px-4 pb-safe">
      <section className="mx-auto w-full max-w-4xl py-5 md:py-8 pb-16">
        <WizardStepHeader
          stepPill={{ stepNumber: 3, majorLabel: "Utgifter", subLabel: "Mat" }}
          title=""
          subtitle="Uppskatta vad du spenderar på matbutik och hämtmat. Ta gärna ett snitt på tre månader."
          helpTitle="Tips för en bättre siffra"
          helpItems={[
            "Kolla kontoutdrag och ta snittet av **2–3 senaste månaderna**.",
            "**Matbutik** = vardagsmat & storhandling. **Hämtmat** = restaurang/leverans.",
            "Om det varierar: välj en **normalmånad** hellre än en dyr/billig extremmånad.",
          ]}
        />

        {/* Make this relative so we can anchor the mascot */}
        <div
          className="
            relative overflow-hidden
            -mx-4 sm:mx-0                
            rounded-none sm:rounded-2xl  
            bg-wizard-shell2/80 border border-wizard-stroke/20 shadow-lg
            px-4 py-5 sm:p-6 md:p-7     
            space-y-5 md:space-y-6
            md:pr-24 md:pb-16
          "
        >


          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 relative z-10">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-wizard-text/80 font-semibold">
                <MdLocalGroceryStore />
                <span>Matbutik</span>
              </div>

              <NumberInput


                placeholder="t.ex. 3 500"
                currency={currency}
                locale={locale}
                error={storeErr}
                {...register(storePath, { setValueAs: setValueAsSvNumber })}
              />
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-wizard-text/80 font-semibold">
                <FaHamburger />
                <span>Hämtmat</span>
              </div>

              <NumberInput


                placeholder="t.ex. 800"
                currency={currency}
                locale={locale}
                error={takeoutErr}
                {...register(takeoutPath, { setValueAs: setValueAsSvNumber })}
              />
            </div>
          </div>

          <Separator className="bg-white/15 relative z-10" />

          <div className="relative z-10">
            <WizardTotalBar
              title="Totalt mat"
              subtitle="Summa för matbutik + hämtmat per månad"
              value={total}
              currency={currency}
              locale={locale}
              suffix="/mån"
              tone="accent"
              subtitleClassName="hidden sm:block"
            />
          </div>
          <WizardMascot
            src={foodBird}
            controls={controls}
            className="
              pointer-events-none select-none absolute
              right-[-14px] bottom-[-14px]
              opacity-[0.12] scale-[1.45]
              md:opacity-100 md:scale-100
              md:right-6 md:bottom-4
            "
            size={120}
            mdSize={120}
            showText={false}
            hello={false}
            float={false}
            tilt={false}
          />
        </div>
      </section>
      {/* Mascot: watermark on mobile, big on md+ */}



    </div>
  );
};

export default SubStepFood;
