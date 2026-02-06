import React from "react";
import { useFieldArray, useFormContext, useFormState } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { PlusCircle, CreditCard } from "lucide-react";

import type { Step4FormValues } from "@/types/Wizard/Step4_Debt/Step4FormValues";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import { useWizard } from "@/context/WizardContext";

import { DebtTemplateModal } from "@/components/organisms/modals/DebtTemplateModal";
import type { DebtTemplate } from "@/types/modal/debts";

import { WizardAccordionRoot } from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import DebtItemAccordion from "./DebtItemAccordion";

export type DebtsCardApi = {
    openFirstErrorDebt: () => void;
};

const DebtsCard = React.forwardRef<DebtsCardApi>(function DebtsCard(_props, ref) {
    const { control, getValues, setValue, clearErrors, resetField, setFocus } =
        useFormContext<Step4FormValues>();

    const { errors } = useFormState({ control, name: "debts" });

    const openFirstErrorDebt = React.useCallback(() => {
        const idx = firstIndexWithError((errors as any)?.debts);
        if (idx == null) return;

        setOpen(String(idx));

        requestAnimationFrame(() => {
            document.getElementById(`debt-${idx}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            const debtErr = (errors as any)?.debts?.[idx];
            const field = firstDebtErrorField(debtErr);
            setFocus(`debts.${idx}.${field}` as const);
        });
    }, [errors, setFocus]);

    React.useImperativeHandle(ref, () => ({ openFirstErrorDebt }), [openFirstErrorDebt]);


    const { fields, append, remove } = useFieldArray({
        control,
        name: "debts",
        keyName: "fieldId",
        shouldUnregister: false,
    });

    const {
        debtsHaveBeenSet,
        activeModal,
        openModal,
        closeModal,
        validationAttempted, // ✅ important
    } = useWizard();

    const isTemplateOpen = activeModal === "debtTemplate";

    const [open, setOpen] = React.useState<string>("");

    const markDebtsDirty = React.useCallback(() => {
        setValue("debts", getValues("debts"), {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: false,
        });
    }, [getValues, setValue]);

    const afterMutate = React.useCallback(
        (affectedIndex?: number) => {
            // ✅ nuke schema + nested errors
            clearErrors("debts");
            if (typeof affectedIndex === "number") {
                clearErrors(`debts.${affectedIndex}` as const);
            }

            markDebtsDirty();


        },
        [clearErrors, markDebtsDirty, validationAttempted]
    );

    const addFromTemplate = React.useCallback(
        (t: DebtTemplate) => {
            const newIndex = fields.length;

            append(
                {
                    id: crypto.randomUUID(),
                    name: t.name,
                    type: t.type,
                    balance: t.balance ?? null,
                    apr: t.apr ?? null,
                    termMonths: t.termMonths ?? null,
                    monthlyFee: t.monthlyFee ?? null,
                    minPayment: t.minPayment ?? null,
                },
                { shouldFocus: false } // ✅ prevent auto-focus -> touched
            );

            // ✅ ensure new subtree starts "clean" (belt + suspenders)
            resetField(`debts.${newIndex}.name`, { defaultValue: t.name });
            resetField(`debts.${newIndex}.type`, { defaultValue: t.type });
            resetField(`debts.${newIndex}.balance`, { defaultValue: t.balance ?? null });
            resetField(`debts.${newIndex}.apr`, { defaultValue: t.apr ?? null });
            resetField(`debts.${newIndex}.termMonths`, { defaultValue: t.termMonths ?? null });
            resetField(`debts.${newIndex}.monthlyFee`, { defaultValue: t.monthlyFee ?? null });
            resetField(`debts.${newIndex}.minPayment`, { defaultValue: t.minPayment ?? null });

            setOpen(String(newIndex));
            closeModal();
            afterMutate(newIndex);
        },
        [append, fields.length, closeModal, afterMutate, resetField]
    );

    const addBlank = React.useCallback(() => {
        const newIndex = fields.length;

        append(
            {
                id: crypto.randomUUID(),
                name: "",
                type: "bank_loan",
                balance: null,
                apr: null,
                termMonths: null,
                monthlyFee: null,
                minPayment: null,
            },
            { shouldFocus: false }
        );

        // ✅ hard reset touched/dirty/error state for the new subtree
        resetField(`debts.${newIndex}.name`, { defaultValue: "" });
        resetField(`debts.${newIndex}.type`, { defaultValue: "bank_loan" });
        resetField(`debts.${newIndex}.balance`, { defaultValue: null });
        resetField(`debts.${newIndex}.apr`, { defaultValue: null });
        resetField(`debts.${newIndex}.termMonths`, { defaultValue: null });
        resetField(`debts.${newIndex}.monthlyFee`, { defaultValue: null });
        resetField(`debts.${newIndex}.minPayment`, { defaultValue: null });

        clearErrors([`debts.${newIndex}` as const, "debts"]);

        setOpen(String(newIndex));
        closeModal();



        markDebtsDirty();
    }, [
        append,
        fields.length,
        closeModal,
        resetField,
        clearErrors,
        validationAttempted,
        markDebtsDirty,
    ]);

    const removeAt = React.useCallback(
        (index: number) => {
            remove(index);

            // keep accordion state sane after removal
            setOpen((cur) => {
                if (!cur) return "";
                const curIdx = Number(cur);
                if (!Number.isFinite(curIdx)) return "";
                if (curIdx === index) return "";
                if (curIdx > index) return String(curIdx - 1);
                return cur;
            });

            afterMutate(index);
        },
        [remove, afterMutate]
    );

    const isEmpty = fields.length === 0;

    return (
        <WizardCard>
            <DebtTemplateModal
                isOpen={isTemplateOpen}
                onClose={closeModal}
                onSelect={addFromTemplate}
                onSelectBlank={addBlank}
            />

            <AnimatePresence mode="wait">
                {isEmpty ? (
                    <motion.div
                        key={debtsHaveBeenSet ? "empty-used" : "empty-first"}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                    >
                        <CreditCard size={48} className="mx-auto text-darkLimeGreen" />

                        <h4 className="mt-4 text-xl font-semibold text-wizard-text">
                            {debtsHaveBeenSet ? "Inga aktiva skulder" : "Lägg till dina skulder"}
                        </h4>

                        <p className="mt-2 max-w-md mx-auto text-wizard-text/60">
                            {debtsHaveBeenSet
                                ? "Vill du lägga till en skuld?"
                                : "Välj en mall (bolån, kreditkort, avbetalning) eller börja från noll."}
                        </p>

                        <button
                            type="button"
                            onClick={() => openModal("debtTemplate")}
                            className="
                mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5
                bg-wizard-surface border border-wizard-stroke/20
                text-sm font-semibold text-wizard-text
                shadow-sm shadow-black/5
                transition-colors
                hover:border-wizard-stroke/35 hover:bg-wizard-stroke/10
                focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45
              "
                        >
                            <PlusCircle size={20} className="text-wizard-text/75" />
                            {debtsHaveBeenSet ? "Lägg till skuld" : "Lägg till första skulden"}
                        </button>

                        {!debtsHaveBeenSet && (
                            <p className="mt-4 text-sm text-wizard-text/50">
                                Har du inga skulder? Svara “Nej” i intro så hoppar vi över.
                            </p>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="list" layout className="flex flex-col gap-y-6">
                        <WizardAccordionRoot
                            type="single"
                            collapsible
                            value={open}
                            onValueChange={(v) => setOpen(v ?? "")}
                        >
                            {fields.map((f, index) => (
                                <motion.div
                                    id={`debt-${index}`}
                                    key={f.fieldId}
                                    layout
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-2xl"
                                >
                                    <DebtItemAccordion index={index} onRemove={removeAt} />
                                </motion.div>
                            ))}
                        </WizardAccordionRoot>

                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => openModal("debtTemplate")}
                                className="
                  inline-flex items-center gap-2 rounded-2xl px-4 py-2
                  bg-wizard-surface border border-wizard-stroke/20
                  text-sm font-semibold text-wizard-text
                  shadow-sm shadow-black/5
                  transition-colors
                  hover:border-wizard-stroke/35 hover:bg-wizard-stroke/10
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45
                "
                            >
                                <PlusCircle size={20} className="text-wizard-text/75" />
                                Lägg till skuld
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </WizardCard>
    );

});
export default DebtsCard;
function hasAnyError(x: unknown): boolean {
    if (!x) return false;
    if (typeof x !== "object") return true;
    return Object.values(x as Record<string, unknown>).some(hasAnyError);
}

function firstIndexWithError(arr: unknown): number | null {
    if (!Array.isArray(arr)) return null;
    for (let i = 0; i < arr.length; i++) {
        if (hasAnyError(arr[i])) return i;
    }
    return null;
}

function firstDebtErrorField(debtErr: any):
    "name" | "type" | "balance" | "apr" | "termMonths" | "monthlyFee" | "minPayment" {
    if (debtErr?.name) return "name";
    if (debtErr?.type) return "type";
    if (debtErr?.balance) return "balance";
    if (debtErr?.apr) return "apr";
    if (debtErr?.termMonths) return "termMonths";
    if (debtErr?.monthlyFee) return "monthlyFee";
    return "minPayment";
}