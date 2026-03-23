import { motion, useReducedMotion } from "framer-motion";
import React from "react";
import { useController, useFormContext } from "react-hook-form";

import { WizardRadioCardGroup } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardRadioCardGroup";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { tDict } from "@/utils/i18n/translate";
import { subStepIntroDict } from "@/utils/i18n/wizard/stepSavings/SubStepIntro.i18n";
import { idFromPath } from "@/utils/idFromPath";
import BirdIllustration from "@assets/Images/bird_freedom.png";

type Habit = "regular" | "sometimes" | "start" | "no";

const SubStepIntro: React.FC = () => {
  const { control } = useFormContext<Step3FormValues>();
  const reduceMotion = useReducedMotion();
  const locale = useAppLocale();

  const t = <K extends keyof typeof subStepIntroDict.sv>(k: K) =>
    tDict(k, locale, subStepIntroDict);

  const { field, fieldState } = useController({
    control,
    name: "intro.savingHabit",
  });

  const options = [
    { value: "regular" as const, label: t("optionRegular") },
    { value: "sometimes" as const, label: t("optionSometimes") },
    { value: "start" as const, label: t("optionStart") },
    { value: "no" as const, label: t("optionNo") },
  ];

  const selected = (field.value ?? null) as Habit | null;
  const showSkipHint = selected === "start" || selected === "no";

  return (
    <div>
      <section className="relative mx-auto w-auto space-y-6 py-8 pb-safe sm:px-6 lg:px-12">
        <motion.img
          src={BirdIllustration}
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none absolute -top-6 right-2
            h-20 w-20 select-none opacity-80
            drop-shadow-[0_16px_32px_rgba(0,0,0,0.12)]
            md:-top-8 md:right-6 md:h-28 md:w-28
          "
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={
            reduceMotion ? { opacity: 0.8 } : { opacity: 0.8, y: [0, -6, 0] }
          }
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : {
                  duration: 5,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }
          }
        />

        <WizardStepHeader
          stepPill={{
            stepNumber: 3,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title={t("title")}
          subtitle={t("subtitle")}
          helpTitle={t("helpTitle")}
          helpItems={[t("help1"), t("help2")]}
        />

        <div
          id={idFromPath("intro.savingHabit")}
          className="
            rounded-2xl border border-wizard-stroke/20
            bg-wizard-shell/50 p-5
            shadow-lg shadow-black/5
          "
        >
          <WizardRadioCardGroup<Habit>
            name={field.name}
            value={(field.value ?? null) as Habit | null}
            options={options}
            onChange={(v) => field.onChange(v)}
            error={fieldState.error?.message}
          />

          {showSkipHint ? (
            <div
              className="
                mt-4 rounded-2xl border border-wizard-stroke
                px-4 py-3 bg-wizard-shell2
                shadow-lg shadow-black/5
                text-center
              "
            >
              <p className="text-sm text-wizard-text/70">{t("skipHint")}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default SubStepIntro;
