import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { Frequency } from "@/types/common";
import { tDict } from "@/utils/i18n/translate";
import { frequencySelectDict } from "@/utils/i18n/wizard/ui/FrequencySelect.i18n";
import { ChevronDown } from "lucide-react";
import React, { forwardRef, useMemo } from "react";

export type FrequencyOption = { value: Frequency; label: string };

export interface RowFrequencySelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> {
  value: Frequency | "";
  onChange: (value: Frequency | "") => void;

  error?: string;
  touched?: boolean;

  options?: FrequencyOption[];
  placeholder?: string;

  className?: string;
  selectClassName?: string;
}

const RowFrequencySelect = forwardRef<
  HTMLSelectElement,
  RowFrequencySelectProps
>(
  (
    {
      value,
      onChange,
      error,
      touched,
      options,
      placeholder,
      id,
      name,
      disabled,
      className,
      selectClassName,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const locale = useAppLocale();
    const t = <K extends keyof typeof frequencySelectDict.sv>(k: K) =>
      tDict(k, locale, frequencySelectDict);

    const defaultOptions = useMemo<FrequencyOption[]>(
      () => [
        { value: "monthly", label: t("monthly") },
        { value: "weekly", label: t("weekly") },
        { value: "biWeekly", label: t("biWeekly") },
        { value: "quarterly", label: t("quarterly") },
        { value: "yearly", label: t("yearly") },
      ],
      [locale], // or [t] if you prefer
    );

    const resolvedOptions = options ?? defaultOptions;
    const resolvedPlaceholder = placeholder ?? t("placeholder");

    const showError = Boolean(error && touched);

    const baseControl = cn(
      "w-full h-11 rounded-xl",
      "bg-wizard-surface",
      "border border-wizard-stroke-strong",
      "shadow-lg",
      "px-4 pr-10",
      "text-wizard-text",
      "transition-colors",
      "focus:outline-none focus:ring-2",
      "whitespace-nowrap overflow-hidden text-ellipsis",
      "disabled:opacity-60 disabled:cursor-not-allowed",
      !showError &&
        "border-wizard-stroke/25 hover:border-wizard-stroke/35 focus:border-wizard-stroke/40 focus:ring-wizard-accent/30",
      showError &&
        "border-wizard-warning/70 focus:border-wizard-warning/70 focus:ring-wizard-warning/25",
    );

    const placeholderTone = value === "" ? "text-wizard-text/40" : "";

    return (
      <div className={cn("w-full", className)}>
        <div className="relative">
          <select
            ref={ref}
            id={id || name}
            name={name}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value as Frequency | "")}
            onBlur={onBlur}
            className={cn(
              baseControl,
              placeholderTone,
              "appearance-none",
              selectClassName,
            )}
            {...rest}
          >
            <option value="" disabled>
              {resolvedPlaceholder}
            </option>

            {resolvedOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className={cn(
              "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4",
              showError ? "text-wizard-warning/80" : "text-wizard-text/55",
            )}
          />
        </div>

        <div className="mt-1 min-h-[16px]">
          {showError ? (
            <span className="ml-1 block text-xs font-semibold text-wizard-warning">
              {error}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);

RowFrequencySelect.displayName = "RowFrequencySelect";
export default RowFrequencySelect;
