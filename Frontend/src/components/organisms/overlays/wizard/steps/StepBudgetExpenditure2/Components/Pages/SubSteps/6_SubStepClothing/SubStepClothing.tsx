import React from "react";
import { useFormContext } from "react-hook-form";
import { Shirt } from "lucide-react";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import GlossyFlipCard from "@components/molecules/cards/GlossyFlipCard/GlossyFlipCard";
import FlipCardText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/text/FlipCardText";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import HelpSection from "@components/molecules/helptexts/HelpSection";

interface ClothingForm {
  clothing: {
    monthlyClothingCost: number | null;
  };
}

const SubStepClothing: React.FC = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext<ClothingForm>();
  const clothingReg = register("clothing.monthlyClothingCost");

  return (
    <OptionContainer>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <div className="flex justify-center md:mt-4 mb-10">
          <GlossyFlipCard
            frontText={<FlipCardText pageKey="clothing" variant="front" />}
            backText={<FlipCardText pageKey="clothing" variant="back" />}
            frontTextClass="text-lg text-white font-semibold"
            backTextClass="text-sm text-limeGreen"
            disableBounce={true}
            containerClassName="w-[170px] h-[400px] md:w-[350px] md:h-[270px]"
          />
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <Shirt className="w-6 h-6 text-darkBlueMenuColor flex-shrink-0" />
                <label htmlFor="monthlyClothingCost" className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor">
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
              id="monthlyClothingCost"
              value={watch("clothing.monthlyClothingCost") ?? 0}
              onValueChange={(val) => setValue("clothing.monthlyClothingCost", val ?? null, { shouldValidate: true })}
              placeholder="t.ex. 500 kr"
              name={clothingReg.name}
              onBlur={clothingReg.onBlur}
              error={errors.clothing?.monthlyClothingCost?.message}
            />
          </div>
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepClothing;
