import React, { useMemo } from "react";
import { useFormContext, useController } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";

import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { WizardRadioCardGroup } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardRadioCardGroup";

import BirdIllustration from "@assets/Images/bird_freedom.png";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { idFromPath } from "@/utils/idFromPath";

type Habit = "regular" | "sometimes" | "start" | "no";

const SubStepIntro: React.FC = () => {
  const { control } = useFormContext<Step3FormValues>();
  const reduceMotion = useReducedMotion();

  const { field, fieldState } = useController({
    control,
    name: "intro.savingHabit",
  });

  const options = useMemo(
    () => [
      { value: "regular" as const, label: "Ja, jag sparar regelbundet." },
      { value: "sometimes" as const, label: "Jag sparar ibland." },
      { value: "start" as const, label: "Nej, men jag vill börja." },
      { value: "no" as const, label: "Nej, det gör jag inte." },
    ],
    []
  );

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
          animate={reduceMotion ? { opacity: 0.8 } : { opacity: 0.8, y: [0, -6, 0] }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { duration: 5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
          }
        />

        <WizardStepHeader
          stepPill={{ stepNumber: 3, majorLabel: "Sparande", subLabel: "Intro" }}
          title="Din resa mot ekonomisk frihet börjar här"
          subtitle="Att spara pengar är ett kraftfullt steg mot nya möjligheter. Hur ser dina sparvanor ut idag?"
          helpTitle="Varför frågar vi?"
          helpItems={[
            "Vi anpassar nästa steg efter din nivå.",
            "Om du inte sparar idag fokuserar vi direkt på mål som hjälper dig igång.",
          ]}
        />

        {/* Surface container (white on blue rule) */}
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
              <p className="text-sm text-wizard-text/70">
                Ingen fara. Vi hoppar över vanor och fokuserar direkt på dina mål.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default SubStepIntro;
