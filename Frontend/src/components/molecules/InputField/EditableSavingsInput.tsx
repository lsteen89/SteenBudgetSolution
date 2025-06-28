import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil } from "lucide-react";
import RangeSlider from "@/components/atoms/InputField/RangeSlider";

interface EditableSavingsInputProps {
  id?: string;
  value: number;
  max: number;
  onChange: (newValue: number) => void;
  "aria-labelledby": string;
}

/**
 * A component that displays a numeric value with a slider,
 * and allows the user to click to edit the exact amount in a text input.
 */
const EditableSavingsInput: React.FC<EditableSavingsInputProps> = ({
  id,
  value,
  max,
  onChange,
  "aria-labelledby": ariaLabelledBy,
}) => {
  const [editing, setEditing] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Commit the new value from the text input
  const commit = () => {
    const raw = Number(inputRef.current?.value ?? value ?? 0);
    const clamped = Math.min(Math.max(raw, 0), max);
    onChange(clamped);
    setEditing(false);
  };

  // Cancel editing
  const cancel = () => {
    setEditing(false);
  };

  return (
    <div id={id} className="space-y-4 w-full"> {/* Make sure our main container knows its width */}
      <RangeSlider
        min={0}
        max={max}
        value={value}
        onChange={onChange} // Pass the onChange handler directly to the slider
        aria-labelledby={ariaLabelledBy}
      />
      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <motion.input
              key="input"
              ref={inputRef}
              id="monthlySavingsInput" // This ID is used by the parent label
              aria-label="Redigera månatligt sparbelopp, kronor"
              title="Månatligt sparbelopp"
              placeholder="0"
              type="number"
              min={0}
              max={max}
              step={100}
              defaultValue={value}
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

              className="group flex flex-wrap justify-center items-center text-white/90 hover:text-limeGreen/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-limeGreen rounded-md cursor-pointer gap-x-2"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Grouped the number and currency for better wrapping behavior */}
              <div className="flex items-baseline">
                <span className="text-3xl leading-none font-bold tabular-nums">
                  {value.toLocaleString("sv-SE")}
                </span>
                <span className="ml-1 text-lg leading-none font-semibold">kr</span>
              </div>
              <Pencil className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          )}
        </AnimatePresence>
        {showHint && !editing && (
          <motion.p
            key="hint"
            className="mt-1 text-xs text-center text-gray-300/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Klicka för att redigera eller ange ett exakt belopp
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default EditableSavingsInput;