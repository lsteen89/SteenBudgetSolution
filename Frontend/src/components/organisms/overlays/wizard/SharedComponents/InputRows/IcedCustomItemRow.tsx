import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import get from "lodash/get";

import RowTextInput from "@components/atoms/InputField/RowTextInput";
import RowNumberInput from "@components/atoms/InputField/RowNumberInput";
import { idFromPath } from "@/utils/idFromPath";
import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { CurrencyCode } from "@/utils/money/currency";
import { cn } from "@/utils/cn";

type Props = {
    basePath: string;
    index: number;
    fieldId: string;

    nameKey?: string;
    amountKey?: string;
    namePlaceholder?: string;
    amountPlaceholder?: string;

    isDeleting: boolean;
    onStartDelete: () => void;
    onRemove: () => void;

    rightSlot?: React.ReactNode;

    currencyOverride?: CurrencyCode;
    localeOverride?: string;
};

const IcedCustomItemRow: React.FC<Props> = ({
    basePath,
    index,
    fieldId,
    nameKey = "name",
    amountKey = "cost",
    namePlaceholder = "Namn",
    amountPlaceholder = "Belopp",
    isDeleting,
    onStartDelete,
    onRemove,
    rightSlot,
    currencyOverride,
    localeOverride,
}) => {
    const { control, register, getFieldState, formState } = useFormContext<any>();
    const { errors, submitCount } = formState;

    const currency = currencyOverride ?? useAppCurrency();
    const locale = localeOverride ?? useAppLocale();
    const showOnSubmit = submitCount > 0;

    const namePath = `${basePath}.${index}.${nameKey}`;
    const amountPath = `${basePath}.${index}.${amountKey}`;

    const nameState = getFieldState(namePath as any, formState);
    const amountState = getFieldState(amountPath as any, formState);

    const nameError = get(errors, namePath)?.message as string | undefined;
    const amountError = get(errors, amountPath)?.message as string | undefined;

    const showNameError = nameState.isTouched || showOnSubmit;
    const showAmountError = amountState.isTouched || showOnSubmit;

    // Reusable “surface input” look (manifesto compliant)
    const inputSurface =
        "bg-wizard-surface border border-wizard-stroke/25 text-wizard-text " +
        "placeholder:text-wizard-text/35 " +
        "focus:ring-2 focus:ring-wizard-accent/30 focus:border-wizard-stroke/40";

    return (
        <motion.div
            layout
            key={fieldId}
            variants={{
                initial: { opacity: 0, scale: 0.98, y: 8 },
                animate: { opacity: 1, scale: 1, y: 0 },
                exit: { opacity: 0, scale: 0.98, x: -200 },
            }}
            initial="initial"
            animate={isDeleting ? "exit" : "animate"}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onAnimationComplete={() => {
                if (isDeleting) onRemove();
            }}
            className={cn(
                "rounded-2xl",
                "bg-wizard-shell border border-wizard-stroke-strong",
                "px-3 py-2.5 sm:px-3.5 sm:py-3",
                "shadow-lg ",
                "transition"
            )}
        >
            {/* Mobile row header: label + delete in one line */}
            <div className="flex items-center justify-between gap-3 md:hidden mb-2">
                <div className="text-xs font-semibold text-wizard-text/70">
                    Person {index + 1}
                </div>

                <button
                    type="button"
                    onClick={onStartDelete}
                    aria-label="Ta bort"
                    className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl",
                        "bg-wizard-surface border border-wizard-stroke/20",
                        "text-wizard-text/60 shadow-sm shadow-black/5",
                        "transition-colors",
                        "hover:border-wizard-warning/30 hover:bg-wizard-warning/10 hover:text-wizard-warning",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45"
                    )}
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Desktop grid row */}
            <div
                className={cn(
                    "grid gap-3 items-start",
                    // md: 2 rows, 3 cols => name | amount/freq | delete
                    "md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_44px] md:grid-rows-2",
                    // lg: 1 row, 4 cols => name | amount | freq | delete
                    "lg:grid-cols-[minmax(170px,170fr)_minmax(0,170px)_minmax(0,240px)_44px] lg:grid-rows-1"
                )}
            >
                {/* Name */}
                <div className="min-w-0 w-full md:row-span-2 lg:row-span-1">
                    <Controller
                        name={namePath as any}
                        control={control}
                        defaultValue={"" as any}
                        render={({ field }) => (
                            <RowTextInput
                                id={idFromPath(namePath)}
                                placeholder={namePlaceholder}
                                {...field}
                                value={field.value ?? ""}
                                error={showNameError ? nameError : undefined}
                                touched={showNameError}
                                inputClassName={cn(
                                    "rounded-xl w-full min-w-0",
                                    "bg-wizard-surface border border-wizard-stroke-strong text-wizard-text shadow-lg",
                                    "placeholder:text-wizard-text/35",
                                    "focus:ring-2 focus:ring-wizard-accent/30 focus:border-wizard-stroke-strong"
                                )}
                            />
                        )}
                    />
                </div>

                {/* Amount */}
                <div className="min-w-0 md:col-start-2 md:row-start-1 lg:col-start-2 lg:row-start-1">
                    <RowNumberInput
                        id={idFromPath(amountPath)}
                        placeholder={amountPlaceholder}
                        currency={currency}
                        locale={locale}
                        error={showAmountError ? amountError : undefined}
                        touched={showAmountError}
                        {...register(amountPath as any, { setValueAs: setValueAsSvNumber })}
                        inputClassName={cn(
                            "rounded-xl w-full min-w-0",
                            "bg-wizard-surface border border-wizard-stroke-strong text-wizard-text shadow-lg",
                            "placeholder:text-wizard-text/35",
                            "focus:ring-2 focus:ring-wizard-accent/30 focus:border-wizard-stroke/40"
                        )}
                    />
                </div>

                {/* Frequency */}
                <div className="min-w-0 md:col-start-2 md:row-start-2 lg:col-start-3 lg:row-start-1">
                    {rightSlot ?? <div />}
                </div>

                {/* Delete */}
                <div className="hidden md:flex justify-end md:col-start-3 md:row-span-2 lg:col-start-4 lg:row-span-1">
                    <button
                        type="button"
                        onClick={onStartDelete}
                        aria-label="Ta bort"
                        className={cn(
                            "grid h-9 w-9 place-items-center rounded-xl",
                            "bg-wizard-surface border border-wizard-stroke/20",
                            "text-wizard-text/60 shadow-sm shadow-black/5",
                            "transition-colors",
                            "hover:border-wizard-warning/30 hover:bg-wizard-warning/10 hover:text-wizard-warning",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45"
                        )}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </motion.div>
    );

};

export default IcedCustomItemRow;
