import React from 'react'; 
import { useFormContext, Controller, FieldPath, get as getRHFValue } from 'react-hook-form';

import TextInput from '@components/atoms/InputField/TextInput';
import FormattedNumberInput from '@components/atoms/InputField/FormattedNumberInput';
import SelectDropdown from '@components/atoms/dropdown/SelectDropdown';
import HelpSectionDark from '@components/molecules/helptexts/HelpSectionDark';
import { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues';
import { idFromPath } from '@/utils/idFromPath';

interface RefactoredHouseholdMemberFieldProps {
  label: string;
  fieldName: FieldPath<IncomeFormValues>;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  displayYearlyIncome?: number | null;
}


function getBaseHelpText(currentLabel: string): string {
  switch (currentLabel) {
    case 'Namn:':
      return 'Ange namnet på hushållsmedlemmen.';
    case 'Nettoinkomst:':
      return 'Ange hushållsmedlemmens nettoinkomst. Exempel inkluderar lön, A-kassa, sjukpenning, pension eller försörjningsstöd.';
    case 'Lönefrekvens:':
      return 'Välj hur ofta hushållsmedlemmen får inkomsten.';
    default:
      return '';
  }
}

const HouseholdMemberField: React.FC<RefactoredHouseholdMemberFieldProps> = ({
  label,
  fieldName,
  type,
  placeholder,
  options,
  displayYearlyIncome,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<IncomeFormValues>();

  // Old help state, refs, and useEffect for handleClickOutside are removed.

  const baseHelpText = getBaseHelpText(label);
  let helpSectionContentNode: React.ReactNode = null;

  if (baseHelpText) {
    if (label === 'Nettoinkomst:') {
      helpSectionContentNode = (
        <p> {/* Parent component (HouseholdMemberField) controls this outer <p> */}
          {baseHelpText}
          <br />
          Räkna ut nettolön via Skatteverket{' '}
          <a
            href="https://www7.skatteverket.se/portal/inkomst-efter-skatt-se-tabell"
            target="_blank"
            rel="noopener noreferrer"
            className="text-darkLimeGreen underline hover:text-green-500" // Added hover for consistency
          >
            här
          </a>.
        </p>
      );
    } else {
      helpSectionContentNode = <p>{baseHelpText}</p>; // Wrap simple text in <p> for consistency
    }
  }

  const fieldError = getRHFValue(errors, fieldName)?.message as string | undefined;

  return (
    <div className="relative mb-4">
      <label htmlFor={idFromPath(fieldName)} className="block text-sm font-medium flex items-center gap-1 pt-2">
        {label}
        {/* Use the new HelpSectionDark component */}
        {helpSectionContentNode && ( // Only show if there's help content
          <HelpSectionDark
            label={label} // The field's label, e.g., "Nettoinkomst:"
            helpText={helpSectionContentNode} // The prepared React.ReactNode
            idSuffix={fieldName} // Use fieldName for unique ID generation
            // You can also pass optional props like triggerButtonClassName if needed here
          />
        )}
      </label>

      {/* Old AnimatePresence and motion.div for help popup are removed. */}

      <Controller
        name={fieldName}
        control={control}
        render={({ field, fieldState }) => {
          const specificFieldError = fieldState.error?.message;
          return (
            <>
              {type === 'text' && (
                <TextInput
                  id={idFromPath(fieldName)}
                  {...field}
                  value={field.value || ''}
                  placeholder={placeholder}
                  error={specificFieldError}
                />
              )}
              {type === 'number' && (
                <FormattedNumberInput

                  ref={field.ref} 
                  name={field.name}
                  id={idFromPath(fieldName)}
                  value={field.value as number | null}

                  onValueChange={field.onChange} 

                  onBlur={field.onBlur}
                  placeholder={placeholder}
                  error={fieldState.error?.message}
                />
              )}
              {type === 'select' && (
                <SelectDropdown
                  {...field}
                  id={idFromPath(fieldName)} // Ensure SelectDropdown uses this id if it needs one
                  value={field.value || ''}
                  options={options || []}
                  error={specificFieldError}
                />
              )}
              {specificFieldError && (!field.ref || (field.ref && !(field.ref as any).dataset?.showsError)) && (
                <p className="text-red-500 text-sm mt-1">{specificFieldError}</p>
              )}
            </>
          );
        }}
      />

      {type === 'number' && displayYearlyIncome !== undefined && displayYearlyIncome !== null && displayYearlyIncome > 0 && (
        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
          Månad: {(displayYearlyIncome / 12).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          (Årlig: {displayYearlyIncome.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 })})
        </p>
      )}
    </div>
  );
};

export default HouseholdMemberField;