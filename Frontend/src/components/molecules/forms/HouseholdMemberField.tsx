import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TextInput from '@components/atoms/InputField/TextInput';
import NumberInput from '@components/atoms/InputField/NumberInput';
import SelectDropdown from '@components/atoms/dropdown/SelectDropdown';

interface HouseholdMemberFieldProps {
  label: string;
  type: 'text' | 'number' | 'select';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  placeholder?: string;
  options?: { value: string; label: string }[];
  id: string;
  yearlyIncome?: number; 
  frequency?: string; 
  error?: string;
  touched?: boolean;
  onBlur?: () => void; 
}

const HouseholdMemberField: React.FC<HouseholdMemberFieldProps> = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  options,
  id,
  yearlyIncome,
  frequency,
  error,
  touched,
  onBlur,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // If the click is outside both the tooltip and the toggle button, close the tooltip.
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
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function getHelpText(label: string) {
    switch (label) {
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
  const helpText = getHelpText(label);
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium flex items-center gap-1 pt-5">
        {label}
        <button
          ref={toggleButtonRef}
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowHelp((prev) => !prev);
          }}
          className="text-darkLimeGreen hover:text-green-700 focus:outline-none"
          title={`Vad är ${label.toLowerCase()}?`}
          aria-label={`Toggle help for ${label}`}
        >
          <Info size={16} />
        </button>
      </label>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            ref={helpRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-2 p-4 bg-customBlue2 text-gray-900 rounded-lg shadow-lg border border-gray-400 w-72"
          >
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="absolute top-2 right-2 text-red-700 hover:text-green-700 focus:outline-none"
              title="Stäng hjälprutan"
              aria-label="Stäng hjälprutan"
            >
              X
            </button>
            <p className="text-sm">
              {helpText}
              {label === 'Nettoinkomst:' && (
                <span>
                  <br />
                  Räkna ut nettolön via skatteverket{' '}
                  <a
                    href="https://www7.skatteverket.se/portal/inkomst-efter-skatt-se-tabell"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-darkLimeGreen underline"
                  >
                    här
                  </a>.
                </span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>


      {type === 'text' && (
        <TextInput id={id} value={value as string} onChange={onChange} placeholder={placeholder} error={error && id.startsWith("memberName") ? error : undefined} onBlur={onBlur} touched={touched} />
      )}
      {type === 'number' && (
        <>
          <NumberInput id={id} value={value as string} onChange={onChange} placeholder={placeholder} error={error && id.startsWith("memberIncome") ? error : undefined} onBlur={onBlur} touched={touched}/>
          {yearlyIncome !== undefined && (
            <p className="text-sm mt-1">
              Årlig inkomst: <strong>{(isNaN(yearlyIncome) ? 0 : yearlyIncome).toLocaleString()} SEK</strong>
            </p>
          )}
        </>
      )}
      {type === 'select' && (
        <SelectDropdown
          label=""
          value={value as string}
          onChange={onChange}
          options={options || []}
          onBlur={onBlur}
        />
      )}
    </div>
  );
};

export default HouseholdMemberField;
