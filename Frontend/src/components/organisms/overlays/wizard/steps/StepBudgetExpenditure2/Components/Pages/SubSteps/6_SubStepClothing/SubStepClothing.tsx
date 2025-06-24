import React from "react";
import { useFormContext } from "react-hook-form";
import { Shirt } from "lucide-react";
import { motion } from "framer-motion";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import GlossyFlipCard from "@components/molecules/cards/GlossyFlipCard/GlossyFlipCard";
import FlipCardText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/text/FlipCardText";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import { idFromPath } from "@/utils/idFromPath";

interface ClothingForm {
  clothing: {
    monthlyClothingCost: number | null;
  };
}

/**
 * SubStepClothing – form step for clothing expenses.
 */
const SubStepClothing: React.FC = () => {
  const {
    watch,
    setValue,
    register,
    formState: { errors },
  } = useFormContext<ClothingForm>();

  const fieldPath = "clothing.monthlyClothingCost";
  const inputId = idFromPath(fieldPath);

  const reg = register(fieldPath);

  return (
    <OptionContainer className="p-4">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe"
      >

        {/* Flip-card illustration */}
        <div className="flex justify-center md:mt-4 mb-10">
          <GlossyFlipCard
            frontText={<FlipCardText pageKey="clothing" variant="front" />}
            backText={<FlipCardText pageKey="clothing" variant="back" />}
            frontTextClass="text-lg text-white font-semibold"
            backTextClass="text-sm text-limeGreen"
            disableBounce
            containerClassName="w-[170px] h-[400px] md:w-[350px] md:h-[270px]"
          />
        </div>

        {/* Glassy input panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
          className="space-y-6 bg-white/5 backdrop-blur-md rounded-2xl p-6 ring-1 ring-white/10 shadow-xl hover:ring-standardMenuColor/50 transition"
        >
            {/* Monthly cost */}
            <div className="space-y-2">
              {/*
                - We allow wrapping with flex-wrap.
                - We keep justify-between to align the help icon to the right if it wraps.
              */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                {/* This container will grow and fill the space */}
                <div className="flex flex-grow items-center gap-2">
                  <Shirt className="h-6 w-6 flex-shrink-0 text-darkBlueMenuColor" />
                  <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor"
                  >
                    Månadskostnad
                  </label>
                </div>
                <HelpSection
                  label=""
                  className="flex-shrink-0"
                  helpText="Ta dina totala klädinköp för de senaste tre månaderna och dividera med tre för att få fram en genomsnittlig månadskostnad."
                />
              </div>


              <FormattedNumberInput
                id={inputId}
                name={reg.name}
                ref={reg.ref}
                onBlur={reg.onBlur}
                value={watch(fieldPath) ?? null}
                onValueChange={(val) =>
                  setValue(fieldPath, val ?? null, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                placeholder="t.ex. 500 kr"
                error={errors.clothing?.monthlyClothingCost?.message}
              />
              {errors.clothing?.monthlyClothingCost?.message && (
                <p className="text-red-600 text-lg mt-1">
                  {errors.clothing.monthlyClothingCost?.message}
                </p>
              )}
            </div>
        </motion.div>
      </motion.section>
    </OptionContainer>
  );
};

export default SubStepClothing;