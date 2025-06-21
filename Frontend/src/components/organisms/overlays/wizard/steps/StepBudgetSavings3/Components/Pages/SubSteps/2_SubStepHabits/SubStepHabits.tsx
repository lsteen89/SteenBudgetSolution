import React, { useState, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil } from "lucide-react";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import RangeSlider from "@components/atoms/InputField/RangeSlider";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { Step3FormValues } from "@/schemas/wizard/StepSavings/step3Schema";
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";

interface CheckboxOptionProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

const CheckboxOption: React.FC<CheckboxOptionProps> = ({ id, label, ...props }) => (
  <label htmlFor={id} className="flex items-center space-x-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors">
    <input
      id={id}
      type="checkbox"
      className="h-5 w-5 rounded border-gray-300 text-lime-500 focus:ring-lime-400 bg-transparent"
      {...props}
    />
    <span className="text-white font-medium">{label}</span>
  </label>
);

const SubStepHabits: React.FC = () => {
  const { watch, setValue, formState: { errors } } = useFormContext<Step3FormValues>();
  
  const income = useWizardDataStore((s) => s.data.income);
  const maxIncome = calcMonthlyIncome(income);

  const monthlySavings = watch("monthlySavings");
  const savingMethods = watch("savingMethods"); // Watch the value directly

  const [editing, setEditing] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commit = () => {
    const raw = Number(inputRef.current?.value ?? monthlySavings ?? 0);
    const clamped = Math.min(Math.max(raw, 0), maxIncome);
    setValue("monthlySavings", clamped, { shouldValidate: true, shouldDirty: true });
    setEditing(false);
  };
  
  const cancel = () => {
    setEditing(false);
  };

  const options = [
    { value: "auto", label: "Automatiska överföringar" },
    { value: "manual", label: "Manuella överföringar" },
    { value: "invest", label: "Investeringar (fonder, aktier, etc.)" },
    { value: "prefer_not", label: "Vill inte ange" },
  ];

  const handleCheckboxChange = (value: string) => {

    const currentValues = Array.isArray(savingMethods) ? [...savingMethods] : [];

    if (value === 'prefer_not') {
      setValue("savingMethods", currentValues.includes('prefer_not') ? [] : ['prefer_not'], { shouldValidate: true, shouldDirty: true });
      return;
    }

    const filteredValues = currentValues.filter(v => v !== 'prefer_not');
    const valueIndex = filteredValues.indexOf(value);

    if (valueIndex > -1) {
      filteredValues.splice(valueIndex, 1);
    } else {
      filteredValues.push(value);
    }
    
    setValue("savingMethods", filteredValues, { shouldValidate: true, shouldDirty: true });
  };

  const sliderValue = typeof monthlySavings === 'number' ? monthlySavings : 0;
  const checkedMethods = Array.isArray(savingMethods) ? savingMethods : [];

  return (
    <OptionContainer>
      <section className="max-w-xl mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-10">
        <header className="space-y-4 text-center">
          <h3 className="text-3xl font-bold text-darkLimeGreen flex justify-center items-center gap-2">
            Perfekt! Låt oss kolla på dina sparvanor
          </h3>
          <p className="text-white opacity-90 text-sm">
            Med denna informationen kan vi sätta upp långsiktiga mål och hjälpa dig att spara smartare.
          </p>
        </header>

        <div className="space-y-4">
          <label
            htmlFor="monthlySavingsInput"
            id="monthlySavingsLabel"
            className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor"
          >
            Ungefär hur mycket sparar du varje månad?
          </label>
          <RangeSlider
            min={0}
            max={maxIncome}
            value={sliderValue}
            onChange={(val) => setValue("monthlySavings", val, { shouldValidate: true, shouldDirty: true })}
            aria-labelledby="monthlySavingsLabel"
          />
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait" initial={false}>
              {editing ? (
                <motion.input
                  key="input"
                  ref={inputRef}
                  id="monthlySavingsInput"
                  aria-label="Redigera månatligt sparbelopp, kronor"
                  title="Månatligt sparbelopp"
                  placeholder="0"
                  type="number"
                  min={0}
                  max={maxIncome}
                  step={100}
                  defaultValue={sliderValue} 
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") cancel();
                  }}
                  className="w-40 text-3xl leading-none bg-transparent text-center font-bold text-white outline-none border-b-2 border-limeGreen focus:border-darkLimeGreen tabular-nums"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  autoFocus
                />
              ) : (
                <motion.button
                  key="label"
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setShowHint(false);
                  }}
                  className="group flex items-center text-white/90 hover:text-limeGreen/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-limeGreen rounded-md cursor-pointer"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                >
                  <span className="text-3xl leading-none font-bold tabular-nums">
                    {sliderValue.toLocaleString("sv-SE")}
                  </span>
                  <span className="ml-1 text-lg leading-none font-semibold">kr</span>
                  <Pencil className="ml-2 w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              )}
            </AnimatePresence>
            {showHint && !editing && (
              <motion.p
                key="hint"
                className="mt-1 text-xs text-gray-300/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Klicka för att redigera eller ange ett exakt belopp
              </motion.p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor" id="saving-methods-label">
            Hur brukar du spara? (Välj alla som passar)
          </label>
          
          <div className="space-y-3" role="group" aria-labelledby="saving-methods-label">
            {options.map((option) => (
              <CheckboxOption
                key={option.value}
                id={`saving-method-${option.value}`}
                label={option.label}
                value={option.value}
                checked={checkedMethods.includes(option.value)} // Use the safe array value
                onChange={() => handleCheckboxChange(option.value)}
              />
            ))}
          </div>

          {errors.savingMethods && (
            <p className="text-sm text-red-500 mt-2" role="alert">
              {errors.savingMethods.message}
            </p>
          )}
          <div id="savingMethods" style={{ height: 0 }} />
          <HelpSection
            label="Varför frågar vi detta?"
            className="mt-2 text-xs text-standardMenuColor/80"
            helpText="Vi undrar hur du vanligtvis sätter undan pengar eftersom det påverkar hur stabilt sparandet blir. Om du sparar manuellt kan vi senare tipsa om automatiska överföringar om dina mål inte nås. Vill du inte svara är det helt okej – välj bara 'Vill inte ange'."
          />
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepHabits;