import React, { useState, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { PiggyBank, Pencil } from "lucide-react";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import RangeSlider from "@components/atoms/InputField/RangeSlider";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { Step3FormValues } from "@/schemas/wizard/step3Schema";
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";

/**
 * Wizard sub‑step that collects the user's saving habits.
 * Animated range‑slider + inline edit + contextual help.
 */
const SubStepHabits: React.FC = () => {
  const { watch, setValue } = useFormContext<Step3FormValues>();
  const income = useWizardDataStore((s) => s.data.income);
  const maxIncome = calcMonthlyIncome(income);

  const monthlySavings = watch("monthlySavings");
  const savingMethod = watch("savingMethod");

  /* -------------- inline edit state -------------- */
  const [editing, setEditing] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /** Persist the new value coming from the inline <input>. */
  const commit = () => {
    const raw = Number(inputRef.current?.value ?? monthlySavings ?? 0);
    const clamped = Math.min(Math.max(raw, 0), maxIncome);
    setValue("monthlySavings", clamped, { shouldValidate: false, shouldDirty: true });
    setEditing(false);
  };
  /** Cancel editing without saving. */
  const cancel = () => {
    setEditing(false);
  };

  /* ---------------------------------------------- */

  return (
    <OptionContainer>
      <section className="max-w-xl mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-10">
        {/* ---------- header ---------- */}
        <header className="space-y-4 text-center">
          <h3 className="text-3xl font-bold text-darkLimeGreen flex justify-center items-center gap-2">
            Perfekt! Låt oss kolla på dina sparvanor
          </h3>
          <p className="text-white opacity-90 text-sm">
            Med denna informationen kan vi sätta upp långsiktiga mål och hjälpa dig att spara smartare.
          </p>
        </header>

        {/* ---------- slider & editable output ---------- */}
        <div className="space-y-4">
          <label
            htmlFor="monthlySavingsInput"
            id="monthlySavingsLabel"
            className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor"
          >
            Ungefär hur mycket sparar du varje månad?
          </label>

          {/* slider */}
          <RangeSlider
            min={0}
            max={maxIncome}
            value={monthlySavings ?? 0}
            onChange={(val) => setValue("monthlySavings", val, { shouldValidate: false, shouldDirty: true })}
            aria-labelledby="monthlySavingsLabel"
          />

          {/* value & hint */}
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
                  defaultValue={monthlySavings ?? 0}
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
                    {(monthlySavings ?? 0).toLocaleString("sv-SE")}
                  </span>
                  <span className="ml-1 text-lg leading-none font-semibold">kr</span>
                  <Pencil className="ml-2 w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* hint text */}
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

        {/* ---------- dropdown with subtle help ---------- */}
        <div className="space-y-1">
          <label
            htmlFor="savingMethodSelect"
            id="savingMethodLabel"
            className="text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor"
          >
            Hur brukar du spara?
          </label>

          <SelectDropdown
            id="savingMethodSelect"
            aria-labelledby="savingMethodLabel"
            label=""
            value={savingMethod ?? ""}
            onChange={(e) => setValue("savingMethod", e.target.value, { shouldValidate: false, shouldDirty: true })}
            options={[
              { value: "", label: "Välj något..", disabled: true },
              { value: "auto", label: "Automatiska överföringar" },
              { value: "manual", label: "Manuella överföringar" },
              { value: "invest", label: "Investeringar" },
              { value: "prefer_not", label: "Vill inte ange" },
            ]}
          />

          {/* help positioned *below* field for a subtler look */}
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
