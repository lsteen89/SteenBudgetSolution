import { motion, useReducedMotion } from "framer-motion";
import React from "react";
import { useController, useFormContext } from "react-hook-form";

import type { WizardRadioOption } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardRadioCardGroup";
import { WizardRadioCardGroup } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardRadioCardGroup";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { Step4FormValues } from "@/types/Wizard/Step4_Debt/Step4FormValues";
import { tDict } from "@/utils/i18n/translate";
import { subStepGatekeeperDict } from "@/utils/i18n/wizard/stepDebt/SubStepGatekeeper.i18n";
import { idFromPath } from "@/utils/idFromPath";
import BirdIllustration from "@assets/Images/bird_freedom.png";

type HasDebts = boolean;

const SubStepGatekeeper: React.FC = () => {
  const { control } = useFormContext<Step4FormValues>();
  const reduceMotion = useReducedMotion();
  const locale = useAppLocale();

  const t = <K extends keyof typeof subStepGatekeeperDict.sv>(k: K) =>
    tDict(k, locale, subStepGatekeeperDict);

  const { field, fieldState } = useController({
    control,
    name: "intro.hasDebts",
  });

  const selected: HasDebts | null =
    field.value === true ? true : field.value === false ? false : null;

  const options = [
    { value: true, label: t("optionYes") },
    { value: false, label: t("optionNo") },
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
          animate={
            reduceMotion ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }
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
            stepNumber: 4,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title=""
          subtitle={t("subtitle")}
          helpTitle={t("helpTitle")}
          helpItems={[t("help1"), t("help2")]}
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
              <p className="text-sm text-wizard-text/70">{t("skipHint")}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default SubStepGatekeeper;
