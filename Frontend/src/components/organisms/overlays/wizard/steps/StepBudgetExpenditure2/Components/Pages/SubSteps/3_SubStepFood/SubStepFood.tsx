import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FaHamburger } from "react-icons/fa";
import { MdLocalGroceryStore } from "react-icons/md";

import { Separator } from "@/components/ui/separator";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import { sumMoney } from "@/utils/money/moneyMath";

import foodBird from "@/assets/Images/FoodDeliveryBird.png";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";

import { useWizardNavEvents } from "@/components/organisms/overlays/wizard/SharedComponents/Nav/WizardNavEvents";
import { useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { tDict } from "@/utils/i18n/translate";
import { subStepFoodDict } from "@/utils/i18n/wizard/stepExpenditure/SubStepFood.i18n";

type FoodForm = {
  food: {
    foodStoreExpenses: number | null;
    takeoutExpenses: number | null;
  };
};

const SubStepFood: React.FC = () => {
  const { control, register, getFieldState, formState } =
    useFormContext<FoodForm>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof subStepFoodDict.sv>(k: K) =>
    tDict(k, locale, subStepFoodDict);

  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const nav = useWizardNavEvents();

  useEffect(() => {
    const off1 = nav.subscribe("nextHoverStart", () => {
      if (reduce) return;
      controls.start({ x: 10, rotate: 1, transition: { duration: 0.18 } });
    });

    const off2 = nav.subscribe("nextHoverEnd", () => {
      if (reduce) return;
      controls.start({ x: 0, rotate: 0, transition: { duration: 0.18 } });
    });

    const off3 = nav.subscribe("nextClick", () => {
      if (reduce) return;
      controls.start({ x: 220, rotate: 6, transition: { duration: 0.32 } });
    });

    return () => {
      off1();
      off2();
      off3();
    };
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
          stepPill={{
            stepNumber: 3,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title=""
          subtitle={t("subtitle")}
          helpTitle={t("helpTitle")}
          helpItems={[t("help1"), t("help2"), t("help3")]}
        />

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
                <span>{t("storeTitle")}</span>
              </div>

              <NumberInput
                placeholder={t("storePlaceholder")}
                currency={currency}
                locale={locale}
                error={storeErr}
                {...register(storePath, {
                  setValueAs: setValueAsLocalizedNumber,
                })}
              />
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-wizard-text/80 font-semibold">
                <FaHamburger />
                <span>{t("takeoutTitle")}</span>
              </div>

              <NumberInput
                placeholder={t("takeoutPlaceholder")}
                currency={currency}
                locale={locale}
                error={takeoutErr}
                {...register(takeoutPath, {
                  setValueAs: setValueAsLocalizedNumber,
                })}
              />
            </div>
          </div>

          <Separator className="bg-white/15 relative z-10" />

          <div className="relative z-10">
            <WizardTotalBar
              title={t("totalTitle")}
              subtitle={t("totalSubtitle")}
              value={total}
              currency={currency}
              locale={locale}
              suffix={t("totalSuffix")}
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
    </div>
  );
};

export default SubStepFood;
