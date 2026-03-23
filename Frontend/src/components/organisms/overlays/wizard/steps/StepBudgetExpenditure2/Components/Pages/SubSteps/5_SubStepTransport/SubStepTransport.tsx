import { useAnimationControls, useReducedMotion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import type { TransportFormShape } from "@/types/Wizard/Step2_Expenditure/TransportFormValues";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { TransportCostsCard } from "./components/TransportCostsCard";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { sumMoneyDeep } from "@/utils/money/moneyMath";
import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";

import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import { useWizardNavEvents } from "@/components/organisms/overlays/wizard/SharedComponents/Nav/WizardNavEvents";

import carBird from "@/assets/Images/CarBird.png";

import { tDict } from "@/utils/i18n/translate";
import { subStepTransportDict } from "@/utils/i18n/wizard/stepExpenditure/SubStepTransport.i18n";

const SubStepTransport: React.FC = () => {
  const { control } = useFormContext<TransportFormShape>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof subStepTransportDict.sv>(k: K) =>
    tDict(k, locale, subStepTransportDict);

  const transport = useWatch({ control, name: "transport" });
  const total = useMemo(() => sumMoneyDeep(transport), [transport]);

  // animation
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const nav = useWizardNavEvents();

  const didIntro = useRef(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (reduce) {
      setIntroDone(true);
      return;
    }
    if (didIntro.current) return;
    didIntro.current = true;

    setIntroDone(false);

    controls.set({ x: -900, y: 18, opacity: 1, rotate: 0 });

    controls
      .start({
        x: [-900, 30, 0],
        y: [18, 0, 0],
        rotate: [0, 1.5, 0],
        transition: {
          duration: 1.15,
          times: [0, 0.85, 1],
          ease: [0.2, 0.9, 0.2, 1],
        },
      })
      .then(() => setIntroDone(true));
  }, [controls, reduce]);

  // React to Next button
  useEffect(() => {
    if (didIntro.current) return;
    const off1 = nav.subscribe("nextHoverStart", () => {
      if (reduce) return;
      controls.start({
        x: 8,
        opacity: 0.55,
        rotate: 1,
        transition: { duration: 0.18, ease: "easeOut" },
      });
    });

    const off2 = nav.subscribe("nextHoverEnd", () => {
      if (reduce) return;
      controls.start({
        x: 0,
        opacity: 1,
        rotate: 0,
        transition: { duration: 0.18, ease: "easeOut" },
      });
    });

    const off3 = nav.subscribe("nextClick", () => {
      if (reduce) return;
      controls.start({
        x: 220,
        opacity: 0,
        rotate: 6,
        transition: { duration: 0.3, ease: [0.2, 0.9, 0.2, 1] },
      });
    });

    return () => {
      off1();
      off2();
      off3();
    };
  }, [nav, controls, reduce]);

  return (
    <div className="p-4">
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
            { emphasis: t("guardLoansEmphasis"), to: t("guardLoansTo") },
            { emphasis: t("guardHereEmphasis"), to: t("guardHereTo") },
          ]}
          helpTitle={t("helpTitle")}
          helpItems={[
            t("help1"),
            t("help2"),
            t("help3"),
            t("help4"),
            t("help5"),
          ]}
        />

        <div className="relative">
          <TransportCostsCard />
        </div>

        <div className="pt-6 relative">
          <WizardTotalBar
            title={t("totalTitle")}
            subtitle={t("totalSubtitle")}
            value={total}
            currency={currency}
            locale={locale}
            suffix={t("totalSuffix")}
            subtitleClassName="hidden sm:block"
            tone="accent"
          />

          <WizardMascot
            src={carBird}
            controls={controls}
            className="
              pointer-events-none select-none
              absolute
              right-2 bottom-2
              opacity-[0.10]
              md:opacity-100
              md:right-1/3 md:bottom-3
              drop-shadow-sm
            "
            size={110}
            mdSize={150}
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

export default SubStepTransport;
