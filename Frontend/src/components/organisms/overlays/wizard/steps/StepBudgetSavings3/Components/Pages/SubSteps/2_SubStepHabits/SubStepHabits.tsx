import React from "react";
import { useFormContext } from "react-hook-form";

// --- Component Imports (Paths to be adjusted) ---
import OptionContainer from "@/components/molecules/containers/OptionContainer";
import HelpSection from "@/components/molecules/helptexts/HelpSection";
import CheckboxOption from "@/components/atoms/InputField/CheckboxOption";
import EditableSavingsInput from "@/components/molecules/InputField/EditableSavingsInput";
import InfoBox from "@/components/molecules/messaging/InfoBox";
// --- Store, Schema, and Utility Imports ---
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { Step3FormValues } from '@/types/Wizard/Step3FormValues';
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";
import { idFromPath } from "@/utils/idFromPath";

const SubStepHabits: React.FC = () => {
  const { watch, setValue, formState: { errors } } = useFormContext<Step3FormValues>();

  const income = useWizardDataStore((s) => s.data.income);
  const maxIncome = calcMonthlyIncome(income);

  const monthlySavings = watch("habits.monthlySavings");
  const savingMethods = watch("habits.savingMethods");

  const options = [
    { value: "auto", label: "Automatiska överföringar" },
    { value: "manual", label: "Manuella överföringar" },
    { value: "invest", label: "Investeringar (fonder, aktier, etc.)" },
    { value: "prefer_not", label: "Vill inte ange" },
  ];

  const handleCheckboxChange = (value: string) => {
    const currentValues = Array.isArray(savingMethods) ? [...savingMethods] : [];

    if (value === 'prefer_not') {
      setValue("habits.savingMethods", currentValues.includes('prefer_not') ? [] : ['prefer_not'], { shouldValidate: true, shouldDirty: true });
      return;
    }

    const filteredValues = currentValues.filter(v => v !== 'prefer_not');
    const valueIndex = filteredValues.indexOf(value);

    if (valueIndex > -1) {
      filteredValues.splice(valueIndex, 1);
    } else {
      filteredValues.push(value);
    }

    setValue("habits.savingMethods", filteredValues, { shouldValidate: true, shouldDirty: true });
  };

  const sliderValue = typeof monthlySavings === 'number' ? monthlySavings : 0;
  const checkedMethods = Array.isArray(savingMethods) ? savingMethods : [];

  return (
    <OptionContainer className="p-4">
      <section className="max-w-xl mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-10">
        <header className="space-y-4 text-center">
          <InfoBox icon={false}>
            {/* Header content */}
            <h3 className="text-3xl font-bold text-darkLimeGreen flex justify-center items-center gap-2">
              Perfekt! Låt oss kolla på dina sparvanor
            </h3>
          </InfoBox>
          <InfoBox icon={false}>
            Med denna informationen kan vi sätta upp långsiktiga mål och hjälpa dig att spara smartare.
          </InfoBox>
        </header>
        <InfoBox icon={false}>
          <div className="text-center">
            <label
              id="monthlySavingsLabel"
              className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor mb-4"
            >
              Ungefär hur mycket sparar du varje månad?
            </label>
            <br />
            <EditableSavingsInput
              id={idFromPath("habits.monthlySavings")}
              value={sliderValue}
              max={maxIncome}
              onChange={(newValue) => setValue("habits.monthlySavings", newValue, { shouldValidate: true, shouldDirty: true })}
              aria-labelledby="monthlySavingsLabel"
            />

            {errors.habits?.monthlySavings && (
              <p className="text-sm text-red-600 mt-2" role="alert">
                {errors.habits?.monthlySavings?.message}
              </p>
            )}
          </div>

          <div className="space-y-2 mt-6">

            <label className="text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor" id="saving-methods-label">
              Hur brukar du spara? (Välj alla som passar)
            </label>
            <div id={idFromPath("habits.savingMethods")} className="space-y-3" role="group" aria-labelledby="saving-methods-label">
              {options.map((option) => (
                <CheckboxOption
                  key={option.value}
                  id={`saving-method-${option.value}`}
                  label={option.label}
                  value={option.value}
                  checked={checkedMethods.includes(option.value)}
                  onChange={() => handleCheckboxChange(option.value)}
                />
              ))}
            </div>
            {/* This is the existing error message for the checkboxes. We just copied the style. */}
            {errors.habits?.savingMethods && (
              <p className="text-sm text-red-600 mt-2" role="alert">
                {errors.habits?.savingMethods?.message}
              </p>
            )}
            <HelpSection
              label="Varför frågar vi detta?"
              className="mt-2 text-xs text-standardMenuColor/80"
              helpText="Vi undrar hur du vanligtvis sätter undan pengar eftersom det påverkar hur stabilt sparandet blir. Om du sparar manuellt kan vi senare tipsa om automatiska överföringar om dina mål inte nås. Vill du inte svara är det helt okej – välj bara 'Vill inte ange'."
            />
          </div>
        </InfoBox>
      </section>
    </OptionContainer>
  );
};

export default SubStepHabits;
