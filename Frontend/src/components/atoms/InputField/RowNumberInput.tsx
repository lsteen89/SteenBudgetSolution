import { cn } from "@/lib/utils";
import { withSanitizedDecimalChange } from "@/utils/forms/decimalInput";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyPartsV2 } from "@/utils/money/moneyV2";
import { ChangeEvent, FocusEvent, forwardRef, useMemo } from "react";

export interface RowNumberInputProps {
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;

  placeholder?: string;
  error?: string;
  touched?: boolean;
  showError?: boolean;

  name?: string;
  id?: string;
  step?: string | number;

  suffix?: string;
  currency?: CurrencyCode;
  locale?: string;

  className?: string;
  inputClassName?: string;
  allowDecimal?: boolean;
}

const RowNumberInput = forwardRef<HTMLInputElement, RowNumberInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      placeholder = "0",
      error,
      touched,
      showError,
      name,
      id,
      step = "any",
      allowDecimal = false,
      suffix,
      currency,
      locale = "sv-SE",
      className = "",
      inputClassName = "",
    },
    ref,
  ) => {
    const resolvedSuffix = useMemo(() => {
      if (suffix) return suffix;
      if (!currency) return undefined;
      return formatMoneyPartsV2(0, currency, { locale }).currency;
    }, [suffix, currency, locale]);

    const isControlled = value !== undefined;
    const shouldShowError = Boolean(error && (showError || touched));

    const handleChange = allowDecimal
      ? withSanitizedDecimalChange(onChange)
      : onChange;

    const baseInput = cn(
      // Control spec
      "w-full h-11 rounded-xl px-4",
      "bg-wizard-surface border text-wizard-text",
      "placeholder:text-wizard-text/35",
      "transition-colors",
      "focus:outline-none focus:ring-2",
      resolvedSuffix ? "pr-16" : "pr-4",
      !shouldShowError &&
        "border-wizard-stroke/25 hover:border-wizard-stroke/35 focus:border-wizard-stroke/40 focus:ring-wizard-accent/30",
      shouldShowError &&
        "border-wizard-warning/70 focus:border-wizard-warning/70 focus:ring-wizard-warning/25",
    );

    return (
      <div className={cn("w-full", className)}>
        <div className="relative">
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            pattern="[0-9.,\s]*"
            name={name}
            id={id || name}
            placeholder={placeholder}
            onChange={handleChange}
            onBlur={onBlur}
            {...(isControlled ? { value } : {})}
            className={cn(baseInput, inputClassName)}
          />

          {resolvedSuffix && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span
                className={cn(
                  "text-xs font-semibold",
                  "text-wizard-text/70",
                  "bg-wizard-shell/40",
                  "border border-wizard-stroke/20",
                  "rounded-lg px-2 py-1",
                )}
              >
                {resolvedSuffix}
              </span>
            </div>
          )}
        </div>

        <div className="mt-1 min-h-[16px]">
          {shouldShowError ? (
            <p className="ml-1 block text-xs font-semibold text-wizard-warning">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
);

RowNumberInput.displayName = "RowNumberInput";
export default RowNumberInput;
