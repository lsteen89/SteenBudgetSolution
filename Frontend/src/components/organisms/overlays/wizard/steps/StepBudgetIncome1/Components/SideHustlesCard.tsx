import React, { useMemo, useState, useEffect } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { Coins, Plus } from "lucide-react";
import get from "lodash/get";

import { WizardCardAccordion } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardCardAccordion";
import IcedCustomItemRow from "@components/organisms/overlays/wizard/SharedComponents/InputRows/IcedCustomItemRow";

import type { IncomeFormValues } from "@/types/Wizard/Step1_Income/IncomeFormValues";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { cn } from "@/lib/utils";
import RowFrequencySelect from "@components/atoms/InputField/RowFrequencySelect";
import { idFromPath } from "@/utils/idFromPath";

type Props = { monthlyTotal: number };

const SideHustlesCard: React.FC<Props> = ({ monthlyTotal }) => {
    const { control, formState } = useFormContext<IncomeFormValues>();
    const { submitCount, errors } = formState;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "sideHustles",
        keyName: "fieldId",
        shouldUnregister: false,
    });

    const [open, setOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);


    const hasErrorsInside = !!get(errors, "sideHustles");
    useEffect(() => {
        if (submitCount > 0 && hasErrorsInside) setOpen(true);
    }, [submitCount, hasErrorsInside]);

    const currency = useAppCurrency();
    const locale = useAppLocale();
    const idx = fields.length;
    const totalText = useMemo(
        () =>
            !open && monthlyTotal > 0
                ? formatMoneyV2(monthlyTotal, currency, locale, { fractionDigits: 0 })
                : undefined,
        [open, monthlyTotal, currency, locale]
    );

    return (
        <WizardCardAccordion
            title="Övriga inkomster"
            icon={<Coins className="w-6 h-6 text-darkLimeGreen" />}
            isOpen={open}
            onToggle={() => setOpen((p) => !p)}
            totalText={totalText}
            totalSuffix="/mån"
            variant="inset"
        >
            <div className="grid gap-3">
                {/* Fold header strip */}
                <div
                    className={cn(
                        "pb-3 border-b border-wizard-stroke/20",
                        "flex flex-col gap-2",
                        "sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    )}
                >
                    <div className="min-w-0">
                        <div
                            className={cn(
                                "text-sm font-semibold text-wizard-text leading-tight",
                                "break-words [hyphens:auto]" // nicer wrapping for long words
                            )}
                            lang="sv"
                        >
                            Sidoinkomst
                        </div>

                        <div className={cn("text-xs text-wizard-text/60", "line-clamp-2")}>
                            Lägg till hushållets andra inkomster och frekvens
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            append({ name: "", income: null, frequency: null });
                            setOpen(true);
                            requestAnimationFrame(() => {
                                document.getElementById(idFromPath(`sideHustles.${idx}.name`))?.focus();
                            });
                        }}
                        className={cn(
                            "h-10 px-3 rounded-xl inline-flex items-center justify-center gap-2",
                            "w-full sm:w-auto shrink-0",
                            "bg-wizard-surface/80 hover:bg-wizard-surface",
                            "border border-wizard-stroke/35 hover:border-wizard-stroke/35",
                            "text-wizard-text/80 hover:text-wizard-text",
                            "transition-colors",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/30"
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="whitespace-nowrap">Lägg till</span>
                    </button>
                </div>
                {fields.map((item, index) => (
                    <IcedCustomItemRow
                        key={item.fieldId}
                        fieldId={item.fieldId}
                        basePath="sideHustles"
                        index={index}
                        nameKey="name"
                        amountKey="income"
                        namePlaceholder="Namn (t.ex. Frilans)"
                        amountPlaceholder="Belopp"
                        isDeleting={item.fieldId === deletingId}
                        onStartDelete={() => setDeletingId(item.fieldId)}
                        onRemove={() => {
                            remove(index);
                            setDeletingId(null);
                        }}
                        rightSlot={
                            <Controller
                                name={`sideHustles.${index}.frequency`}
                                control={control}
                                render={({ field, fieldState }) => {
                                    const touched = fieldState.isTouched || submitCount > 0;

                                    return (
                                        <RowFrequencySelect
                                            value={field.value ?? ""}
                                            onChange={(v) => field.onChange(v === "" ? null : v)}
                                            touched={touched}
                                            error={fieldState.error?.message}
                                        />
                                    );
                                }}
                            />
                        }
                    />
                ))}
            </div>
        </WizardCardAccordion>
    );
};

export default SideHustlesCard;
