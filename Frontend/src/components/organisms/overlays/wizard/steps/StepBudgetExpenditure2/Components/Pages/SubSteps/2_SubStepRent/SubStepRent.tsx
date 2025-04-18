import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown";
import HomeTypeOption from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/2_SubStepRent/HomeTypeOption";
import { motion } from "framer-motion";
interface RentForm {
  rent: {
    homeType: string;
    monthlyRent: number | null;
    rentExtraFees: number | null; // specific to rent
    monthlyFee: number | null;
    brfExtraFees: number | null;  // specific to brf
    mortgagePayment: number | null;
    houseotherCosts: number | null; // specific to house
    otherCosts: number | null; // specific to free
  };
}

const SubStepRent: React.FC = () => {
  const {
    getValues,
    control,
    formState: { errors },
  } = useFormContext<RentForm>();
  console.log("SubStepRent rendered");
  console.log("SubStepRent errors", errors);
  console.log("SubStepRent control", control);
  console.log("SubStepRent control value", control.getValues("rent.homeType"));

  return (
    <div className="relative w-5/6 mx-auto mt-4">
      <h3 className="text-2xl font-bold text-darkLimeGreen mb-4 text-center">Vilken typ av boende har du?</h3>

      
      {/* HomeType Select using Controller only */}
      <Controller
        control={control}
        name="rent.homeType"
        defaultValue=""
        render={({ field }) => (
          <SelectDropdown
            value={field.value}
            onChange={(e) => field.onChange(e)}
            onBlur={field.onBlur}
            selectRef={field.ref}
            options={[
              { value: "", label: "välj något...", disabled: true, hidden: true },
              { value: "rent", label: "Hyresrätt" },
              { value: "brf", label: "Bostadsrätt" },
              { value: "house", label: "Hus" },
              { value: "free", label: "Jag bor gratis!" },
            ]}
            error={errors.rent?.homeType?.message}
          />
        )}
      />

      <HomeTypeOption />
    </div>
  );
};

export default SubStepRent;
