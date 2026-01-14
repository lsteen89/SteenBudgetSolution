import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown";
import { idFromPath } from "@/utils/idFromPath";
import { ExpenditureFormValues } from "@/types/Wizard/ExpenditureFormValues";
import HomeTypeOption from "./components/HomeTypeOption";
import RunningCosts from "./components/RunningCosts";

const SubStepHousing: React.FC = () => {
  const { control, watch } = useFormContext<ExpenditureFormValues>();

  // Watch the homeType to determine what payment fields to show
  const homeType = watch("housing.homeType");

  return (
    <div className="flex flex-col gap-8 w-full max-w-md mx-auto mt-4 p-4">
      <section>
        <h3 className="text-2xl font-bold text-darkLimeGreen mb-6 text-center">
          Vilken typ av boende har du?
        </h3>

        <Controller
          control={control}
          name="housing.homeType"
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
                { value: "rent", label: "Hyresrätt" },
                { value: "brf", label: "Bostadsrätt" },
                { value: "house", label: "Hus" },
                { value: "free", label: "Jag bor gratis!" },
              ]}
            />
          )}
        />
      </section>

      {/* Conditionally render Payment Details (Rent vs Fee vs Mortgage) */}
      {homeType && homeType !== "free" && (
        <section className="animate-in fade-in slide-in-from-top-2">
          <HomeTypeOption homeType={homeType} />
        </section>
      )}

      {/* Always show Running Costs if a type is selected */}
      {homeType && (
        <section className="border-t pt-6">
          <RunningCosts />
        </section>
      )}
    </div>
  );
};

export default SubStepHousing;