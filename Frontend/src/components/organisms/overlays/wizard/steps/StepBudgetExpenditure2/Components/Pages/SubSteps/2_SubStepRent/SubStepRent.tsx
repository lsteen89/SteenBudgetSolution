import React, { ChangeEvent } from "react"; 
import { useFormContext, Controller, FieldPath } from "react-hook-form";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown"; 
import HomeTypeOption from "@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/2_SubStepRent/components/HomeTypeOption";
import { idFromPath } from "@/utils/idFromPath"; // 👈 Import the utility

interface RentForm {
  rent: {
    homeType: string;
    monthlyRent: number | null;
    rentExtraFees: number | null;
    monthlyFee: number | null;
    brfExtraFees: number | null;
    mortgagePayment: number | null;
    houseotherCosts: number | null;
    otherCosts: number | null;
  };
}

const SubStepRent: React.FC = () => {
  const {
    control,
  } = useFormContext<RentForm>();
       
  return (
    <div className="relative w-full max-w-md mx-auto mt-4 p-4">
      <h3 className="text-2xl font-bold text-darkLimeGreen mb-6 text-center">
        Vilket typ av boende har du?
      </h3>

      <Controller
        control={control}
        name={"rent.homeType"}
        defaultValue=""
        render={({ field, fieldState }) => (
          <SelectDropdown
            id={idFromPath(field.name)}
            name={field.name}
            ref={field.ref}
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            options={[
              { value: "", label: "Välj typ av boende...", disabled: true },
              { value: "rent",  label: "Hyresrätt"  },
              { value: "brf",   label: "Bostadsrätt" },
              { value: "house", label: "Hus"        },
              { value: "free",  label: "Jag bor gratis!" }
            ]}
          />
        )}
      />

      <HomeTypeOption />
    </div>
  );
};

export default SubStepRent;