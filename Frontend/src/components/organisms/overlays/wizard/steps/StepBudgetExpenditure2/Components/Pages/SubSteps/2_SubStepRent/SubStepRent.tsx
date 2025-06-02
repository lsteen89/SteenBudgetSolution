import React, { ChangeEvent } from "react"; 
import { useFormContext, Controller, FieldPath } from "react-hook-form";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown"; 
import HomeTypeOption from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/2_SubStepRent/HomeTypeOption";


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
        name={"rent.homeType" as FieldPath<RentForm>}
        defaultValue=""
        render={({
          field: { onChange: rhfOnChange, onBlur: rhfOnBlur, value: rhfValue, name: rhfName, ref: rhfRef }, // Destructure RHF field props
          fieldState: { error: rhfError } // Destructure error from fieldState
        }) => (
          <SelectDropdown
            ref={rhfRef} 
            name={rhfName} // Pass name from RHF field
            id={rhfName}   // Use name for id, good for label association
            value={String(rhfValue || "")}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              rhfOnChange(e.target.value);
            }}
            onBlur={rhfOnBlur} // Pass RHF's onBlur
            options={[
              { value: "", label: "Välj typ av boende...", disabled: true }, // Default/placeholder
              { value: "rent", label: "Hyresrätt" },
              { value: "brf", label: "Bostadsrätt" },
              { value: "house", label: "Hus" },
              { value: "free", label: "Jag bor gratis!" },
            ]}
            error={rhfError?.message} 

          />
        )}
      />

      <HomeTypeOption /> {/* This will presumably use watch("rent.homeType") internally */}
    </div>
  );
};

export default SubStepRent;