import React from "react";
import { cn } from "@/lib/utils";

type Primitive = string | number | boolean;

export type WizardRadioOption<T extends Primitive> = {
    value: T;
    label: string;
    description?: string;
};

type Props<T extends Primitive> = {
    name: string;
    value: T | null;
    options: WizardRadioOption<T>[];
    onChange: (value: T) => void;
    error?: string;
    className?: string;
};

const toDomValue = (v: Primitive) => String(v);

export function WizardRadioCardGroup<T extends Primitive>({
    name,
    value,
    options,
    onChange,
    error,
    className,
}: Props<T>) {
    const selectedDom = value === null ? null : toDomValue(value);

    return (
        <fieldset className={cn("space-y-3", className)}>
            <legend className="sr-only">{name}</legend>

            {options.map((opt) => {
                const optDom = toDomValue(opt.value);
                const isSelected = selectedDom === optDom;

                return (
                    <label
                        key={optDom}
                        className={cn(
                            "group relative flex items-start gap-3 rounded-2xl px-4 py-3 cursor-pointer",
                            "border bg-wizard-shell2 shadow-lg shadow-black/5",
                            "transition-colors",
                            // default
                            "border-wizard-stroke/20 hover:border-wizard-stroke/35",
                            // focus
                            "focus-within:outline-none focus-within:ring-2 focus-within:ring-wizard-stroke/45",
                            // selected (pop but calm)
                            isSelected && "border-wizard-accent/35 bg-wizard-stroke/10"
                        )}
                    >
                        {/* custom radio */}
                        <span
                            className={cn(
                                "mt-1 grid h-5 w-5 place-items-center rounded-full border",
                                "bg-wizard-surface shadow-sm shadow-black/5",
                                isSelected ? "border-wizard-accent/50" : "border-wizard-stroke/30"
                            )}
                            aria-hidden="true"
                        >
                            <span
                                className={cn(
                                    "h-2.5 w-2.5 rounded-full transition-transform",
                                    isSelected ? "bg-wizard-accent scale-100" : "bg-transparent scale-75"
                                )}
                            />
                        </span>

                        <input
                            type="radio"
                            name={name}
                            value={optDom}
                            checked={isSelected}
                            onChange={() => onChange(opt.value)}
                            className="sr-only"
                        />

                        <div className="min-w-0">
                            <div className="font-semibold text-wizard-text/90">
                                {opt.label}
                            </div>

                            {opt.description ? (
                                <div className="mt-0.5 text-sm text-wizard-text/65">
                                    {opt.description}
                                </div>
                            ) : null}
                        </div>

                        {/* subtle right-side affordance */}
                        <span
                            className={cn(
                                "ml-auto mt-1 h-2 w-2 rounded-full transition-opacity",
                                isSelected ? "bg-wizard-accent opacity-80" : "bg-wizard-stroke/30 opacity-0 group-hover:opacity-60"
                            )}
                            aria-hidden="true"
                        />
                    </label>
                );
            })}

            {error ? (
                <p className="pt-1 text-sm font-semibold text-wizard-warning" role="alert">
                    {error}
                </p>
            ) : null}
        </fieldset>
    );
}
