import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Frequency } from "@/types/common";

export type FrequencyOption = { value: Frequency; label: string };

export interface RowFrequencySelectProps
    extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
    value: Frequency | "";
    onChange: (value: Frequency | "") => void;

    error?: string;
    touched?: boolean;

    options?: FrequencyOption[];
    placeholder?: string;

    className?: string;
    selectClassName?: string;
}

const DEFAULT_OPTIONS: FrequencyOption[] = [
    { value: "monthly", label: "Per månad" },
    { value: "weekly", label: "Per vecka" },
    { value: "biWeekly", label: "Varannan vecka" },
    { value: "quarterly", label: "Per kvartal" },
    { value: "yearly", label: "Årligen" },
];

const RowFrequencySelect = forwardRef<HTMLSelectElement, RowFrequencySelectProps>(
    (
        {
            value,
            onChange,
            error,
            touched,
            options = DEFAULT_OPTIONS,
            placeholder = "Välj frekvens",
            id,
            name,
            disabled,
            className,
            selectClassName,
            onBlur,
            ...rest
        },
        ref
    ) => {
        const showError = Boolean(error && touched);

        const baseControl = cn(
            // Control spec (match RowTextInput / RowNumberInput)
            "w-full h-11 rounded-xl",
            "bg-wizard-surface",
            "border border-wizard-stroke-strong",
            "shadow-lg",
            "px-4 pr-10", // room for chevron
            "text-wizard-text",
            "transition-colors",
            "focus:outline-none focus:ring-2",
            "whitespace-nowrap overflow-hidden text-ellipsis",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            !showError &&
            "border-wizard-stroke/25 hover:border-wizard-stroke/35 focus:border-wizard-stroke/40 focus:ring-wizard-accent/30",
            showError && "border-wizard-warning/70 focus:border-wizard-warning/70 focus:ring-wizard-warning/25"
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
                            // make native select look consistent
                            "appearance-none",
                            selectClassName
                        )}
                        {...rest}
                    >
                        <option value="" disabled>
                            {placeholder}
                        </option>

                        {options.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    {/* Chevron */}
                    <ChevronDown
                        className={cn(
                            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4",
                            showError ? "text-wizard-warning/80" : "text-wizard-text/55"
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
    }
);

RowFrequencySelect.displayName = "RowFrequencySelect";
export default RowFrequencySelect;
