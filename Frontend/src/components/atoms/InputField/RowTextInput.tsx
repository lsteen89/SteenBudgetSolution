import React, { ChangeEvent, FocusEvent, forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface RowTextInputProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "onBlur" | "value"> {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: FocusEvent<HTMLInputElement>) => void;

    placeholder?: string;
    error?: string;
    touched?: boolean;
    showError?: boolean;

    name?: string;
    id?: string;

    className?: string; // wrapper
    inputClassName?: string; // input override
}

const RowTextInput = forwardRef<HTMLInputElement, RowTextInputProps>(
    (
        {
            value,
            onChange,
            onBlur,
            placeholder = "",
            error,
            touched,
            showError,
            name,
            id,
            className = "",
            inputClassName = "",
            ...rest
        },
        ref
    ) => {
        const shouldShowError = Boolean(error && (showError || touched));

        const baseInput = cn(
            // Control spec
            "w-full h-11 rounded-xl px-4",
            "bg-wizard-surface",
            "border",
            "text-wizard-text",
            "placeholder:text-wizard-text/35",
            "transition-colors",
            "focus:outline-none focus:ring-2",
            // states
            !shouldShowError &&
            "border-wizard-stroke/25 hover:border-wizard-stroke/35 focus:border-wizard-stroke/40 focus:ring-wizard-accent/30",
            shouldShowError &&
            "border-wizard-warning/70 focus:border-wizard-warning/70 focus:ring-wizard-warning/25"
        );

        return (
            <div className={cn("w-full", className)}>
                <input
                    ref={ref}
                    type="text"
                    name={name}
                    id={id || name}
                    value={value ?? ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={cn(baseInput, inputClassName)}
                    {...rest}
                />

                <div className="mt-1 min-h-[16px]">
                    {shouldShowError ? (
                        <span className="ml-1 block text-xs font-semibold text-wizard-warning">
                            {error}
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }
);

RowTextInput.displayName = "RowTextInput";
export default RowTextInput;
