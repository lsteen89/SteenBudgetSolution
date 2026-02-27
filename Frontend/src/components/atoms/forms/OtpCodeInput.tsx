import { cn } from "@/lib/utils";
import * as React from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  shakeKey?: number;
  onComplete?: () => void;
  length?: number; // default 6
  "aria-label"?: string;
};

export function OtpCodeInput({
  value,
  onChange,
  disabled,
  autoFocus,
  shakeKey = 0,
  onComplete,
  length = 6,
  "aria-label": ariaLabel = "One-time code",
}: Props) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const didAutoFocus = React.useRef(false);

  const digits = React.useMemo(() => {
    const clean = (value ?? "").replace(/\D/g, "").slice(0, length);
    return Array.from({ length }, (_, i) => clean[i] ?? "");
  }, [value, length]);

  const focusAt = React.useCallback((i: number) => {
    const el = refs.current[i];
    if (!el) return;
    // RAF makes focus “stick” after state updates
    requestAnimationFrame(() => {
      el.focus();
      el.select(); // so typing overwrites existing digit
    });
  }, []);

  //  Do autofocus once per mount (shakeKey remounts component anyway)
  React.useEffect(() => {
    if (!autoFocus) return;
    if (didAutoFocus.current) return;
    didAutoFocus.current = true;
    focusAt(0);
  }, [autoFocus, focusAt]);

  const setAt = (i: number, ch: string) => {
    const next = [...digits];
    next[i] = ch;

    onChange(next.join(""));

    if (ch) {
      // go forward
      if (i < length - 1) focusAt(i + 1);
      else focusAt(i);
    }

    // Correct “complete” check
    if (next.every((d) => d !== "")) onComplete?.();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;

    const next = pasted.padEnd(length, "").slice(0, length);
    onChange(next);

    const nextIndex = pasted.length >= length ? length - 1 : pasted.length; // go to next empty (or last)
    focusAt(nextIndex);

    if (pasted.length >= length) onComplete?.();
  };

  const baseInput =
    "h-14 w-12 sm:h-16 sm:w-14 rounded-2xl text-center text-xl font-semibold " +
    "bg-eb-surface/80 border border-eb-stroke/45 shadow-[0_10px_18px_rgb(var(--eb-text)/0.06)] " +
    "focus:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/30 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const renderInput = (i: number) => (
    <input
      key={i}
      ref={(el) => (refs.current[i] = el)}
      inputMode="numeric"
      pattern="\d*"
      maxLength={1}
      disabled={disabled}
      className={baseInput}
      value={digits[i]}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const ch = e.target.value.replace(/\D/g, "").slice(0, 1);
        setAt(i, ch);
      }}
      onKeyDown={(e) => {
        if (e.key === "Backspace") {
          e.preventDefault();
          if (digits[i]) {
            setAt(i, "");
            focusAt(i);
            return;
          }
          if (i > 0) {
            setAt(i - 1, "");
            focusAt(i - 1);
          }
          return;
        }
        if (e.key === "ArrowLeft" && i > 0) focusAt(i - 1);
        if (e.key === "ArrowRight" && i < length - 1) focusAt(i + 1);
      }}
      aria-label={`Digit ${i + 1}`}
      autoComplete={i === 0 ? "one-time-code" : "off"}
    />
  );

  return (
    <div
      key={shakeKey} // remount => re-animate on shake
      className={cn(
        "flex items-center justify-center flex-nowrap",
        "gap-2 sm:gap-3",
        shakeKey > 0 && "animate-[eb-shake_280ms_ease-in-out]",
      )}
      aria-label={ariaLabel}
      onPaste={onPaste}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {[0, 1, 2].map(renderInput)}
      </div>

      <span
        aria-hidden="true"
        className="mx-2 sm:mx-3 text-eb-text/30 font-bold select-none hidden sm:inline-block"
      >
        —
      </span>

      <div className="flex items-center gap-3 sm:gap-4">
        {[3, 4, 5].map(renderInput)}
      </div>
    </div>
  );
}
