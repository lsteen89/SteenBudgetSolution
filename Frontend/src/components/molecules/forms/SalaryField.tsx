import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberInput from '@components/atoms/InputField/NumberInput';
import SelectDropdown from '@components/atoms/dropdown/SelectDropdown';

interface SalaryFieldProps {
    netSalary: number | null;
    yearlySalary: number;
    salaryFrequency: string;
    handleSalaryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setSalaryFrequency: (value: string) => void;
    errors: { netSalary?: string; salaryFrequency?: string };
    touched: { [key: string]: boolean };
    setTouched: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
    validateFields: () => boolean;
  }

  const SalaryField: React.FC<SalaryFieldProps> = ({
    netSalary,
    yearlySalary,
    salaryFrequency,
    handleSalaryChange,
    setSalaryFrequency,
    errors,
    touched,
    setTouched,
    validateFields,
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

  const helpText = 'Din huvudsakliga inkomstkälla.';
  const detailedHelpText = 'Primär inkomst är din huvudsakliga inkomstkälla. Exempel inkluderar lön, A-kassa, sjukpenning, pension eller försörjningsstöd.';

  return (
    <div className="relative" ref={helpRef}>
      <label className="block text-sm font-medium flex items-center gap-1">
        Primär inkomst (SEK)
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-darkLimeGreen hover:text-green-700 focus:outline-none"
          title="Vad är primär inkomst?"
          aria-label="Toggle help for primär inkomst"
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

      <NumberInput
        name="netSalary"
        id="netSalary"
        value={netSalary === null ? "" : netSalary}
        onChange={handleSalaryChange}
        placeholder="Ange din nettolön"
        error={errors.netSalary && touched.netSalary ? errors.netSalary : undefined}
        onBlur={() => {
            setTouched((prev) => ({ ...prev, netSalary: true }));
            setTimeout(() => validateFields(), 0);
        }}
        />
        {yearlySalary > 0 && (
        <p className="mt-2 text-sm">
            Årlig inkomst: <strong>{yearlySalary.toLocaleString()} SEK</strong>
        </p>
        )}
        <SelectDropdown
        label="Lönefrekvens:"
        value={salaryFrequency}
        onChange={(e) => setSalaryFrequency(e.target.value)}
        options={[
            { value: "monthly", label: "Per månad" },
            { value: "weekly", label: "Per vecka" },
            { value: "quarterly", label: "Per kvartal" },
            { value: "annually", label: "Årligen" },
        ]}
        error={
            errors.salaryFrequency && touched.salaryFrequency
            ? errors.salaryFrequency
            : undefined
        }
        onBlur={() => {
            setTouched((prev) => ({ ...prev, salaryFrequency: true }));
            validateFields();
        }}
        />

    </div>
  );
};

export default SalaryField;