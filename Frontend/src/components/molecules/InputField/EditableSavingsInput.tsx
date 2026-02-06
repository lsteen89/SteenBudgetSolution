import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil } from "lucide-react";
import RangeSlider from "@/components/atoms/InputField/RangeSlider";

interface EditableSavingsInputProps {
  id?: string;
  value: number | null;

  /** Slider track max (soft cap). MUST be finite. */
  softMax: number;

  /** Typing max (hard cap). If omitted, typing is unlimited. */
  hardMax?: number;
  onBlur?: () => void;
  onChange: (n: number | null) => void;
  ariaLabelledBy?: string;
  hintText?: string;
  step?: number;

  /** Format number for display (currency/locale). */
  formatValue?: (n: number) => string;

  markers?: { value: number; label?: string; className?: string }[];
  sliderValueLabel?: string;
}

function clamp(n: number, min: number, max?: number) {
  if (!Number.isFinite(n)) return min;
  const lo = Math.max(n, min);
  return typeof max === "number" && Number.isFinite(max) ? Math.min(lo, max) : lo;
}

function parseSvInt(raw: string): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  // allow spaces and separators, keep digits + minus
  const digits = s.replace(/[^\d-]/g, "");
  if (!digits || digits === "-") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

const EditableSavingsInput: React.FC<EditableSavingsInputProps> = ({
  id,
  value,
  softMax,
  hardMax,
  onBlur,
  onChange,
  ariaLabelledBy,
  hintText = "Klicka för att redigera eller ange ett exakt belopp",
  step = 100,
  formatValue,
  markers = [],
  sliderValueLabel,
}) => {
  const [editing, setEditing] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sliderMax = useMemo(() => {
    const n = Number(softMax);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n);
  }, [softMax]);

  //const sliderValue = useMemo(() => clamp(value ?? 0, 0, sliderMax), [value, sliderMax]);
  const sliderValue = clamp(value ?? 0, 0, sliderMax);
  const displayText = useMemo(() => {
    const v = Math.round(Number.isFinite(value ?? 0) ? value ?? 0 : 0);

    try {
      return formatValue ? formatValue(v) : v.toLocaleString("sv-SE");
    } catch {
      return String(v);
    }
  }, [value, formatValue]);


  const commit = () => {
    const rawText = inputRef.current?.value ?? "";
    const parsed = parseSvInt(rawText);

    if (parsed === null) {
      onChange(null);
      setEditing(false);
      return;
    }

    const next = clamp(parsed, 0, hardMax);
    onChange(Math.round(next));
    onBlur?.();
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  return (
    <div id={id} className="space-y-4 w-full pt-8">
      <RangeSlider
        min={0}
        max={sliderMax}
        step={step}
        value={sliderValue}
        onChange={(n) => onChange(clamp(n, 0, sliderMax))}
        aria-labelledby={ariaLabelledBy}
        showValueLabel
        formatValueLabel={(n: number) =>
          formatValue ? formatValue(Math.round(n)) : Math.round(n).toLocaleString("sv-SE")
        }
        markers={markers}
        valueLabel={sliderValueLabel}
      />


      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <motion.input
              key="input"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              aria-label="Redigera månatligt sparbelopp"
              placeholder="0"
              defaultValue={value === null ? "" : String(Math.round(value))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-44 text-3xl leading-none bg-transparent text-center font-bold text-wizard-text outline-none border-b-2 border-limeGreen focus:border-darkLimeGreen tabular-nums"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
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
              className="group flex flex-wrap justify-center items-center text-darkLimeGreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-limeGreen rounded-md cursor-pointer gap-x-2 pt-6"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <span className="text-3xl leading-none font-bold tabular-nums">{displayText}</span>
              <Pencil className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity text-wizard-text" />
            </motion.button>
          )}
        </AnimatePresence>

        {showHint && !editing && (
          <motion.div
            key="hint"
            className="mt-1 text-xs text-center text-wizard-text/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >

            {hintText}
            <p className="text-[11px] text-wizard-text/40">
              Skalan visar upp till ca <b>70%</b> av inkomsten (för att hålla den användbar).
            </p>

          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EditableSavingsInput;
