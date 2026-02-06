import React, { useMemo } from "react";
import { useFormContext, useController } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { WizardRadioCardGroup } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardRadioCardGroup";
import type { WizardRadioOption } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardRadioCardGroup";

import BirdIllustration from "@assets/Images/bird_freedom.png";
import type { Step4FormValues } from "@/types/Wizard/Step4_Debt/Step4FormValues";
import { idFromPath } from "@/utils/idFromPath";

type HasDebts = boolean;

const SubStepGatekeeper: React.FC = () => {
  const { control } = useFormContext<Step4FormValues>();
  const reduceMotion = useReducedMotion();

  const { field, fieldState } = useController({
    control,
    name: "intro.hasDebts",
  });


  const selected: HasDebts | null =
    field.value === true ? true : field.value === false ? false : null;

  const options = [
    { value: true, label: "Ja, jag vill lägga till skulder." },
    { value: false, label: "Nej, jag har inga skulder." },
  ] satisfies WizardRadioOption<HasDebts>[];

  const showSkipHint = selected === false;

  return (
    <div>
      <section className="relative w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6">
        <motion.img
          src={BirdIllustration}
          alt=""
          aria-hidden="true"
          className="absolute -top-6 right-2 md:-top-8 md:right-6 w-20 h-20 md:w-28 md:h-28 opacity-90 pointer-events-none select-none drop-shadow-lg"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { duration: 5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
          }
        />

        <WizardStepHeader
          stepPill={{ stepNumber: 4, majorLabel: "Skulder", subLabel: "Intro" }}
          title=""
          subtitle="Vi kan samla allt på ett ställe så du får en tydlig bild av betalningar och utveckling."
          helpTitle="Varför frågar vi?"
          helpItems={[
            "Om du har skulder kan vi räkna med betalningar i din helhet.",
            "Om du inte har några hoppar vi över det här steget.",
          ]}
        />

        <div
          id={idFromPath("intro.hasDebts")}
          className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"
        >
          <WizardRadioCardGroup<HasDebts>
            name={field.name}
            value={selected}
            options={options}
            onChange={(v) => field.onChange(v)}
            error={fieldState.error?.message}
          />

          {showSkipHint ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center">
              <p className="text-sm text-wizard-text/70">
                Isåfall är vi klara! Bara en kort summering återstår!
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default SubStepGatekeeper;
