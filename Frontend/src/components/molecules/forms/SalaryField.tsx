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
  // Help for primary income
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

  // Help for frequency (Lönefrekvens)
  const [showFrequencyHelp, setShowFrequencyHelp] = useState(false);
  const frequencyHelpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleFrequencyClickOutside(event: MouseEvent) {
      if (frequencyHelpRef.current && !frequencyHelpRef.current.contains(event.target as Node)) {
        setShowFrequencyHelp(false);
      }
    }
    document.addEventListener('mousedown', handleFrequencyClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleFrequencyClickOutside);
    };
  }, []);

  const frequency = 'Välj hur ofta du får din inkomst utbetald.';
  const detailedHelpText =
    'Detta representerar din huvudsakliga inkomstkälla. Exempel inkluderar lön, A-kassa, sjukpenning, pension eller försörjningsstöd.';

  return (
    <div className="relative">
      {/* Primary Income Section */}
      <div className="block text-sm font-medium flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <span>Huvudinkomst (SEK)</span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowHelp((prev) => !prev);
          }}
          className="text-darkLimeGreen hover:text-green-700 focus:outline-none"
          title="Vad är primär inkomst?"
          aria-label="Toggle help for primär inkomst"
        >
          <Info size={16} />
        </button>
      </div>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            ref={helpRef} // Attach the ref directly to the tooltip.
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-2 p-4 bg-customBlue2 text-gray-900 rounded-lg shadow-lg border border-gray-400 w-72"
          >
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
            <p className="text-gray-900 text-sm">
              {detailedHelpText}
              <p className="text-sm">
                Räkna ut nettolön via skatteverket{' '}
                <a
                  href="https://www7.skatteverket.se/portal/inkomst-efter-skatt-se-tabell"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-darkLimeGreen underline"
                >
                  här
                </a>.
              </p>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <NumberInput
        name="netSalary"
        id="netSalary"
        value={netSalary === null ? "" : netSalary}
        onChange={handleSalaryChange}
        placeholder="Ange din nettoinkomst"
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

      {/* Frequency (Lönefrekvens) Section with Help */}
      <div className="relative mt-4">
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
          <span className="block text-sm font-medium">Lönefrekvens:</span>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowFrequencyHelp((prev) => !prev);
            }}
            className="text-darkLimeGreen hover:text-green-700 focus:outline-none"
            title="Vad är lönefrekvens?"
            aria-label="Toggle help for lönefrekvens"
          >
            <Info size={16} />
          </button>
        </div>

        <AnimatePresence>
          {showFrequencyHelp && (
            <motion.div
              ref={frequencyHelpRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 mt-2 p-4 bg-customBlue2 text-gray-900 rounded-lg shadow-lg border border-gray-400 w-72"
            >
              <button
                type="button"
                onClick={() => setShowFrequencyHelp(false)}
                className="absolute top-2 right-2 text-red-700 hover:text-green-700 focus:outline-none"
                title="Stäng hjälprutan"
                aria-label="Stäng hjälprutan"
              >
                X
              </button>
              <p className="text-gray-900 text-sm">{frequency}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SelectDropdown
        // Omitting the label prop since we already provided a custom label with help icon.
        value={salaryFrequency}
        onChange={(e) => setSalaryFrequency(e.target.value)}
        options={[
          { value: "monthly", label: "Per månad" },
          { value: "weekly", label: "Per vecka" },
          { value: "quarterly", label: "Per kvartal" },
          { value: "annually", label: "Årligen" },
        ]}
        error={
          errors.salaryFrequency && touched.salaryFrequency ? errors.salaryFrequency : undefined
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
