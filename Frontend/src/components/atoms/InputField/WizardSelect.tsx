import React, {
    ChangeEvent,
    FocusEvent,
    forwardRef,
    SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; disabled?: boolean; hidden?: boolean };

export interface WizardSelectProps
    extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "onBlur" | "value"> {
    options: Option[];
    value?: string;
    onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
    onBlur?: (event: FocusEvent<HTMLSelectElement>) => void;

    title?: string;
    label?: string;
    error?: string;

    className?: string; // wrapper
    inputClassName?: string; // actual select styling override
}

const WizardSelect = forwardRef<HTMLSelectElement, WizardSelectProps>(
    (
        {
            options,
            value = "",
            onChange,
            onBlur,
            title,
            label,
            error,
            id,
            name,
            disabled,
            className = "",
            inputClassName = "",
            ...rest
        },
        ref
    ) => {
        const baseSelect = cn(
            "w-full rounded-2xl px-4 py-3 pr-10",
            "bg-wizard-surface border",
            "text-wizard-text",
            "shadow-[0_10px_28px_rgba(0,0,0,0.10)]",
            "transition-colors",
            "focus:outline-none focus:ring-2",
            "appearance-none",
            disabled && "opacity-60 cursor-not-allowed"
        );

        const stateClasses = error
            ? cn(
                "border-wizard-warning/70",
                "focus:border-wizard-warning/70",
                "focus:ring-wizard-warning/25"
            )
            : cn(
                "border-wizard-stroke/20",
                "hover:border-wizard-stroke/35",
                "focus:border-wizard-stroke/40",
                "focus:ring-wizard-stroke/45"
            );

        // When value is empty, visually treat it as placeholder-ish
        const placeholderTone = value === "" ? "text-wizard-text/50" : "";

        return (
            <div className={cn("w-full", className)}>
                <div className="min-w-0">
                    <div className="text-sm lg:text-base font-semibold text-wizard-text truncate">
                        {title}
                    </div>


                </div>
                {label ? (
                    <label htmlFor={id} className="text-sm font-semibold text-wizard-text/80">
                        {label}
                    </label>
                ) : null}

                <div className="relative">
                    <select
                        ref={ref}
                        id={id || name}
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        disabled={disabled}
                        className={cn(baseSelect, stateClasses, placeholderTone, inputClassName)}
                        {...rest}
                    >
                        {options.map((opt) => (
                            <option
                                key={opt.value}
                                value={opt.value}
                                disabled={opt.disabled}
                                hidden={opt.hidden}
                            >
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    {/* chevron */}
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" className="text-wizard-text/55">
                            <path
                                fill="currentColor"
                                d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"
                            />
                        </svg>
                    </div>
                </div>

                {/* stable height like RowNumberInput */}
                <div className="mt-1 min-h-[16px]">
                    {error ? (
                        <span className="ml-2 block text-xs font-bold text-wizard-warning">
                            {error}
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }
);

WizardSelect.displayName = "WizardSelect";
export default WizardSelect;
