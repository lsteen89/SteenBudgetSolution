import React, { forwardRef, ChangeEvent, FocusEvent, useMemo } from "react";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyPartsV2 } from "@/utils/money/moneyV2";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  label?: string;

  /** Right-side label action (e.g., tooltip icon). */
  labelRight?: React.ReactNode;

  /** Full custom label row (advanced). If set, you render everything yourself. */
  labelNode?: React.ReactNode;

  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  step?: string | number;

  suffix?: string;
  currency?: CurrencyCode;
  locale?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      labelRight,
      labelNode,
      value,
      onChange,
      onBlur,
      placeholder = "0",
      error,
      name,
      id,
      step = "any",
      suffix,
      currency,
      locale = "sv-SE",
    },
    ref
  ) => {
    const resolvedSuffix = useMemo(() => {
      if (suffix) return suffix;
      if (!currency) return undefined;
      return formatMoneyPartsV2(0, currency, { locale }).currency;
    }, [suffix, currency, locale]);

    const isControlled = value !== undefined;
    const inputId = id ?? name;

    const allowDecimalInput = (s: string) => s.replace(/[^\d.,\s]/g, "");

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const cleaned = allowDecimalInput(e.target.value);
      if (cleaned !== e.target.value) e.target.value = cleaned;
      onChange?.(e);
    };

    const hasError = Boolean(error);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {/* Label row */}
        {labelNode ? (
          <div className="flex items-center justify-between gap-3">{labelNode}</div>
        ) : label ? (
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor={inputId}
              className="text-sm font-semibold text-wizard-text/80"
            >
              {label}
            </label>

            {labelRight ? <div className="shrink-0">{labelRight}</div> : null}
          </div>
        ) : null}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="text"
            inputMode="decimal"
            step={step}
            placeholder={placeholder}
            onChange={handleChange}
            onBlur={onBlur}
            {...(isControlled ? { value } : {})}
            className={cn(
              [
                "w-full rounded-2xl px-4 py-3",
                "bg-wizard-surface border",
                "text-wizard-text placeholder:text-wizard-text/40",
                "shadow-[0_10px_28px_rgba(0,0,0,0.10)]",
                "transition-colors",
                "focus:outline-none focus:ring-2",
              ].join(" "),
              resolvedSuffix ? "pr-16" : "",
              hasError
                ? "border-wizard-warning/70 focus:border-wizard-warning/70 focus:ring-wizard-warning/25"
                : "border-wizard-stroke/20 hover:border-wizard-stroke/35 focus:border-wizard-stroke/40 focus:ring-wizard-stroke/45"
            )}
          />

          {resolvedSuffix && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span
                className={cn(
                  "rounded-xl px-2 py-1 text-xs font-bold",
                  "bg-wizard-surface border border-wizard-stroke/20",
                  "text-wizard-text/70 shadow-sm shadow-black/5"
                )}
              >
                {resolvedSuffix}
              </span>
            </div>
          )}
        </div>

        {error && (
          <span className="ml-2 animate-in fade-in slide-in-from-top-1 text-xs font-bold text-wizard-warning">
            {error}
          </span>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";
export default NumberInput;
