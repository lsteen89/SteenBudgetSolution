import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TextInput from '@components/atoms/InputField/TextInput';
import NumberInput from '@components/atoms/InputField/NumberInput';

interface SideHustleFieldProps {
  label: string;
  type: 'text' | 'number' | 'select';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  placeholder?: string;
  options?: { value: string; label: string }[];
  id: string;
  onBlur?: () => void;
  yearlyIncome?: number;
}

const SideHustleField: React.FC<SideHustleFieldProps> = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  options,
  id,
  onBlur,
  yearlyIncome,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
        setShowDetailedHelp(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const helpText = getHelpText(label);

  function getHelpText(label: string) {
    switch (label) {
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

  return (
    <div className="relative" ref={helpRef}>
<label
  htmlFor={id}
  className="block text-sm font-medium flex items-center gap-1"
  onClick={(e) => e.stopPropagation()}
>
  <span>{label}</span>
  <button
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-2 p-4 bg-customBlue2 text-gray-900 rounded-lg shadow-lg border border-gray-400 w-72"
          >
            <p className="text-sm">{helpText}</p>
                        {/* Close Button */}
                        <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="absolute top-2 right-2 text-red-700 hover:text-green-700 focus:outline-none"
              title="Stäng hjälprutan"
              aria-label="Stäng hjälprutan"
            >
              X
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {type === 'text' && (
        <TextInput id={id} value={value as string} onChange={onChange} placeholder={placeholder} onBlur={onBlur}/>
      )}
        {type === 'number' && (
        <>
            <NumberInput
            id={id}
            value={value as string}
            onChange={onChange}
            placeholder={placeholder}
            onBlur={onBlur}
            />
            {yearlyIncome !== undefined && (
            <p className="text-sm mt-1">
                Årlig inkomst:{" "}
                <strong>{Number.isNaN(yearlyIncome) ? 0 : yearlyIncome}  SEK</strong>
            </p>
            )}
        </>
        )}
      
      {type === 'select' && (
        <select
          id={id}
          value={value as string}
          onChange={onChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 focus:ring-darkLimeGreen focus:border-darkLimeGreen sm:text-sm rounded-lg bg-white/60 backdrop-blur-md shadow-md"
          onBlur={onBlur} // Add onBlur event
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default SideHustleField;
