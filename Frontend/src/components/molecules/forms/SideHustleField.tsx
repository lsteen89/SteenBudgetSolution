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
  const detailedHelpText = getDetailedHelpText(label);

  function getHelpText(label: string) {
    switch (label) {
      case 'Inkomstens namn:':
        return 'Ange ett beskrivande namn för din inkomst.';
      case 'Inkomst (SEK):':
        return 'Ange inkomstens storlek.';
      case 'Inkomstfrekvens:':
        return 'Välj hur ofta du får inkomsten.';
      default:
        return '';
    }
  }

  function getDetailedHelpText(label: string) {
    switch (label) {
      case 'Inkomstens namn:':
        return 'Inkomstens namn bör vara tydligt och beskrivande, så att du enkelt kan identifiera inkomstkällan.';
      case 'Inkomst (SEK):':
        return 'Ange ett numeriskt värde för inkomstens storlek.';
      case 'Inkomstfrekvens:':
        return 'Välj mellan månadsvis, veckovis, kvartalsvis eller årlig inkomstfrekvens.';
      default:
        return '';
    }
  }

  return (
    <div className="relative" ref={helpRef}>
      <label htmlFor={id} className="block text-sm font-medium flex items-center gap-1">
        {label}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
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
            <button
              type="button"
              onClick={() => setShowDetailedHelp(true)}
              className="underline text-darkLimeGreen mt-2 block"
              title="Läs mer om detta ämne"
              aria-label="Läs mer om detta ämne"
            >
              Läs mer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailedHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-20 mt-2 p-4 bg-white border border-gray-300 rounded-lg shadow-lg w-80"
          >
            <div className="flex justify-between items-center">
              <p className="text-gray-900 text-sm">{detailedHelpText}</p>
              <button 
                type="button"
                onClick={() => setShowDetailedHelp(false)}
                className="text-gray-600 hover:text-gray-900"
                title="Stäng detaljerad hjälp"
                aria-label="Stäng detaljerad hjälp"
              >
                <X size={18} />
              </button>
            </div>
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
