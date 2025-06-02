import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown";
import HelpSection from '@components/molecules/helptexts/HelpSectionDark';
import { useFormContext, Controller, FieldPath } from 'react-hook-form'; // Added FieldPath
import { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues'; // Assuming this is your main form type

interface SalaryFieldProps {
  netSalaryFieldName: FieldPath<IncomeFormValues>; // Use FieldPath for type safety
  salaryFrequencyFieldName: FieldPath<IncomeFormValues>;
  yearlySalaryCalculated: number | null; // This remains for display
}

const SalaryField: React.FC<SalaryFieldProps> = ({
  netSalaryFieldName,
  salaryFrequencyFieldName,
  yearlySalaryCalculated, // This is for display
}) => {
  const { control, formState: { errors } } = useFormContext<IncomeFormValues>();

  const frequencyHelpText = "Välj hur ofta du får din inkomst utbetald.";
  const detailedHelpText =
    "Detta representerar din huvudsakliga inkomstkälla. Exempel inkluderar lön, A-kassa, sjukpenning, pension eller försörjningsstöd.";

  // Get specific errors for the fields this component manages
  const netSalaryError = errors[netSalaryFieldName]?.message as string | undefined;
  const salaryFrequencyError = errors[salaryFrequencyFieldName]?.message as string | undefined;

  return (
    <div className="relative">
      {/* Primary Income label & help icon */}
      <div
        className="block text-sm font-medium flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span>Huvudinkomst (SEK)</span>
        <HelpSection
          label=""
          helpText={
            <>
              {detailedHelpText} <br />
              Räkna ut din nettolön med hjälp av Skatteverkets verktyg{" "}
              <a
                href="https://www7.skatteverket.se/portal/inkomst-efter-skatt-se-tabell"
                target="_blank"
                rel="noopener noreferrer"
                className="text-darkLimeGreen underline"
              >
                här
              </a>
            </>
          }
        />
      </div>

      {/* Net Salary Input using RHF Controller */}
      <Controller
        name={netSalaryFieldName}
        control={control}
        defaultValue={null} // Important for controlled components that expect a specific empty state
        render={({ field, fieldState }) => (
          <FormattedNumberInput
            ref={field.ref}
            name={field.name}
            id={field.name} 
            value={field.value as number | null}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Ange din nettoinkomst"
            error={fieldState.error?.message}

          />
        )}
      />
      {/* RHF Controller handles error display based on schema if NumberInput doesn't show it,
          or you can display it explicitly as before using netSalaryError */}
      {netSalaryError && !errors[netSalaryFieldName]?.ref && ( // Avoid duplicate display if input shows it
        <p className="text-red-500 text-sm mt-1">{netSalaryError}</p>
      )}


      {/* Frequency label & help icon */}
      <div className="relative mt-4">
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
          <span className="block text-sm font-medium">Lönefrekvens:</span>
          <HelpSection label="" helpText={<>{frequencyHelpText}</>} />
        </div>
      </div>

      {/* Frequency Dropdown using RHF Controller */}
      <Controller
        name={salaryFrequencyFieldName}
        control={control}
        defaultValue={"monthly"} // Or fetch from store via RHF defaultValues in the form
        render={({ field, fieldState }) => (
          <SelectDropdown
            value={field.value || "monthly"}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur} 
            options={[
              { value: "monthly", label: "Per månad" },
              { value: "weekly", label: "Per vecka" },
              { value: "quarterly", label: "Per kvartal" },
              { value: "annually", label: "Årligen" },
            ]}
            error={fieldState.error?.message}
          />
        )}
      />
       {salaryFrequencyError && !errors[salaryFrequencyFieldName]?.ref && (
        <p className="text-red-500 text-sm mt-1">{salaryFrequencyError}</p>
      )}

      {/* Display of yearlySalaryCalculated (passed as prop) remains the same logic as before,
          it's not part of RHF control here, just display.
          The parent component (StepBudgetIncome) will calculate this based on watched RHF values.
      */}
    </div>
  );
};

export default SalaryField;