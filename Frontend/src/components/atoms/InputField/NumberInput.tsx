import React, { forwardRef, ChangeEvent, FocusEvent, useMemo } from "react";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyPartsV2 } from "@/utils/money/moneyV2";

interface NumberInputProps {
  label?: string;
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

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-sm font-bold text-gray-900 ml-1">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            type="number"
            step={step}
            name={name}
            id={id}
            placeholder={placeholder}
            onChange={onChange}
            onBlur={onBlur}
            // ✅ Only set `value` in controlled mode
            {...(isControlled ? { value } : {})}
            className={`
              block w-full p-4 rounded-2xl transition-all duration-200
              bg-white/60 backdrop-blur-md border-2 outline-none
              shadow-sm text-gray-900 placeholder:text-gray-400
              focus:ring-2 focus:ring-darkLimeGreen/20
              ${resolvedSuffix ? "pr-16" : ""}
              ${error
                ? "border-red-500 focus:border-red-500"
                : "border-gray-200 focus:border-darkLimeGreen"}
            `}
          />

          {resolvedSuffix && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span className="text-xs font-bold text-gray-500 bg-white/70 border border-gray-200 rounded-xl px-2 py-1">
                {resolvedSuffix}
              </span>
            </div>
          )}
        </div>

        {error && (
          <span className="text-xs font-bold text-red-500 ml-2 animate-in fade-in slide-in-from-top-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";
export default NumberInput;
