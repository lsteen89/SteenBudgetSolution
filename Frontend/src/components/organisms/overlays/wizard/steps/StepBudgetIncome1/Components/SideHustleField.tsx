import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormContext, Controller, FieldPath, get as getRHFValue } from 'react-hook-form';

import TextInput from '@components/atoms/InputField/TextInput';
import FormattedNumberInput from '@components/atoms/InputField/FormattedNumberInput'; // Assuming this is your number input component
// Note: You were using a raw <select> here, not SelectDropdown. We'll stick to that.
import { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues'; // Adjust path

interface SideHustleFieldProps {
  label: string;
  fieldName: FieldPath<IncomeFormValues>; // e.g., "sideHustles.0.name"
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[]; // For the select type
  displayYearlyIncome?: number | null; // To show calculated income for the 'income' field
}

const SideHustleField: React.FC<SideHustleFieldProps> = ({
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

  const [showHelp, setShowHelp] = useState(false);
  // const [showDetailedHelp, setShowDetailedHelp] = useState(false); // This was unused, so removed. Add back if needed.
  const helpRef = useRef<HTMLDivElement>(null); // For click outside to close tooltip
  const toggleButtonRef = useRef<HTMLButtonElement>(null); // For click outside to close tooltip

  // useEffect for handleClickOutside (to close tooltip) - can remain similar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        helpRef.current &&
        !helpRef.current.contains(target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(target)
      ) {
        setShowHelp(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function getHelpText(currentLabel: string): string {
    switch (currentLabel) {
      case 'Sidoinkomstens namn:':
        return 'Ange ett beskrivande namn för din inkomst. Exempel kan vara olika bidrag, försäljning av saker eller tjänster, eller andra inkomstkällor.';
      case 'Sidoinkomst netto(SEK):':
        return 'Ange inkomstens storlek.';
      case 'Inkomstfrekvens:':
        return 'Välj hur ofta du får inkomsten. Vissa inkomster är sporadiska, medan andra kommer regelbundet, försök att uppskatta hur ofta du får inkomsten.';
      default:
        return '';
    }
  }
  const helpTextContent = getHelpText(label);

  // Get error for this specific field from RHF
  const fieldError = getRHFValue(errors, fieldName)?.message as string | undefined;

  return (
    <div className="relative mb-4"> 
      <label
        htmlFor={fieldName} // Use RHF fieldName for unique ID
        className="block text-sm font-medium flex items-center gap-1 pt-2"
        // onClick={(e) => e.stopPropagation()} // Not strictly needed on label usually
      >
        <span>{label}</span>
        {helpTextContent && (
          <button
            ref={toggleButtonRef}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp((prev) => !prev);
            }}
            className="text-darkLimeGreen hover:text-green-700 focus:outline-none"
            title={`Information om ${label.toLowerCase()}`}
            aria-label={`Visa hjälp för ${label}`}
          >
            <Info size={16} />
          </button>
        )}
      </label>

      <AnimatePresence>
        {showHelp && helpTextContent && (
          <motion.div
            ref={helpRef} // helpRef for the tooltip itself
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 mt-1 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md shadow-xl border border-gray-300 dark:border-gray-700 w-full max-w-xs sm:max-w-sm"
          >
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
              title="Stäng"
              aria-label="Stäng hjälprutan"
            >
              <X size={18} />
            </button>
            <p className="text-sm pr-5">{helpTextContent}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Controller
        name={fieldName}
        control={control}
        defaultValue={type === 'number' ? null : ''} // Sensible default for Controller
        render={({ field, fieldState }) => {
          const specificFieldErrorFromController = fieldState.error?.message;
          return (
            <>
              {type === 'text' && (
                <TextInput
                  id={fieldName}
                  {...field}
                  value={field.value || ''} // Ensure controlled input
                  placeholder={placeholder}
                  error={specificFieldErrorFromController}
                  // touched={fieldState.isTouched} // If TextInput uses it for styling
                />
              )}
              {type === 'number' && (
                <FormattedNumberInput
                  ref={field.ref}     
                  name={field.name}   
                  id={fieldName}     
                  
                  value={field.value as number | null} 
                  onValueChange={field.onChange} 

                  onBlur={field.onBlur}  

                  placeholder={placeholder}
                  error={fieldState.error?.message}

                />
              )}
              {type === 'select' && (
                <select
                  id={fieldName}
                  {...field} // Spreads name, value, onChange, onBlur, ref
                  className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 dark:border-gray-600 focus:ring-darkLimeGreen focus:border-darkLimeGreen sm:text-sm rounded-lg bg-white/80 dark:bg-gray-700/80 backdrop-blur-md shadow-sm text-gray-900 dark:text-gray-100"
                >
                  {/* Add a default empty/placeholder option if desired */}
                  {/* <option value="">Välj frekvens...</option> */}
                  {options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {/* General error display if not handled by the input itself */}
              {specificFieldErrorFromController && (
                 <p className="text-red-500 text-sm mt-1">{specificFieldErrorFromController}</p>
              )}
            </>
          );
        }}
      />

      {/* Display yearly income if type is 'number' and prop is provided */}
      {type === 'number' && displayYearlyIncome !== undefined && displayYearlyIncome !== null && displayYearlyIncome > 0 && (
        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
          Månad: {(displayYearlyIncome / 12).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          (Årlig: {displayYearlyIncome.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 })})
        </p>
      )}
    </div>
  );
};

export default SideHustleField;
