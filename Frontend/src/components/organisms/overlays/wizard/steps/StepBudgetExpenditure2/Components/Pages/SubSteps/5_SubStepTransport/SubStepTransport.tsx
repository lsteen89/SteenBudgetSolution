import React from "react";
import { useFormContext } from "react-hook-form";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import GlossyFlipCard from "@components/molecules/cards/GlossyFlipCard/GlossyFlipCard";
import FlipCardText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/text/FlipCardText";
import { VehicleCosts } from "./components/VehicleCosts";
import { TransitCosts } from "./components/TransitCosts";

interface TransportForm {
  transport: {
    monthlyFuelCost: number | null;
    monthlyInsuranceCost: number | null;
    monthlyTotalCarCost: number | null;
    monthlyTransitCost: number | null;
  };
}

const SubStepTransport: React.FC = () => {
  const { formState: { errors } } = useFormContext<TransportForm>();


  return (
    <OptionContainer>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <div className="flex justify-center md:mt-4 mb-10">
          <GlossyFlipCard
            frontText={<FlipCardText pageKey="transportation" variant="front" />}
            backText={<FlipCardText pageKey="transportation" variant="back" />}
            frontTextClass="text-lg text-white font-semibold"
            backTextClass="text-sm text-limeGreen"
            disableBounce={true}
            containerClassName="w-[170px] h-[400px] md:w-[350px] md:h-[270px]"
          />
        </div>

        <div className="space-y-8">
          <VehicleCosts />
          <TransitCosts />
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepTransport;