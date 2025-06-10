import React, { ChangeEvent } from "react"; 
import { useFormContext, Controller, FieldPath } from "react-hook-form";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown"; 
import HomeTypeOption from "@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/2_SubStepRent/components/HomeTypeOption";


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
    <div className="relative w-full max-w-md mx-auto mt-4 p-4"> {/* Adjusted width and padding */}
      <h3 className="text-2xl font-bold text-darkLimeGreen mb-6 text-center"> {/* Increased mb */}
        Vilket typ av boende har du?
      </h3>

      {        /* Controller for rent.homeType */}
      <Controller
        control={control}
        name={"rent.homeType"}                // RHF path
        defaultValue=""                       // ← no need to cast
        render={({ field, fieldState }) => (
          <SelectDropdown
            /* ① name === id === RHF path */
            id={field.name}
            name={field.name}

            /* ② wire to RHF */
            ref={field.ref}
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}

            /* ③ show validation error */
            error={fieldState.error?.message}

            /* ④ options */
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

      <HomeTypeOption /> {/* This will presumably use watch("rent.homeType") internally */}
    </div>
  );
};

export default SubStepRent;