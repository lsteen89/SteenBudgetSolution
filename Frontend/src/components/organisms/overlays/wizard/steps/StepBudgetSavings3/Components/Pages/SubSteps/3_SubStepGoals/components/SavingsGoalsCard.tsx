import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusCircle, PiggyBank } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { GoalTemplateModal } from "@/components/organisms/modals/GoalTemplateModal";
import type { GoalTemplate } from "@/types/modal/savings";
import { useWizard } from "@/context/WizardContext";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";

import { WizardAccordionRoot } from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import SavingsGoalItemAccordion from "./SavingsGoalItemAccordion";
import { useFormState } from "react-hook-form";


export type SavingsGoalsCardApi = {
    openFirstErrorGoal: () => void;
};

const SavingsGoalsCard = React.forwardRef<SavingsGoalsCardApi>(function SavingsGoalsCard(_props, ref) {
    const { control, clearErrors, setFocus } =
        useFormContext<Step3FormValues>();

    const { errors } = useFormState({ control, name: "goals" });


    const { fields, append, remove } = useFieldArray({
        control,
        name: "goals",
        keyName: "fieldId",
        shouldUnregister: false,
    });

    const {
        goalsHaveBeenSet,
        activeModal,
        openModal,
        closeModal,
    } = useWizard();

    const isTemplateOpen = activeModal === "goalTemplate";

    const [open, setOpen] = React.useState<string>("");
    const [showAllGoals, setShowAllGoals] = React.useState(false);
    const deferredFields = React.useDeferredValue(fields);
    const LARGE_LIST_THRESHOLD = 8;
    const compactListMode = deferredFields.length > LARGE_LIST_THRESHOLD && !showAllGoals;
    const openIndex = Number(open);
    const visibleIndexSet = React.useMemo(() => {
        if (!compactListMode) {
            return new Set(deferredFields.map((_, index) => index));
        }
        const keep = new Set<number>([0, 1, 2]);
        if (Number.isFinite(openIndex) && openIndex >= 0) {
            keep.add(openIndex);
        }
        return keep;
    }, [compactListMode, deferredFields, openIndex]);

    const openFirstErrorGoal = React.useCallback(() => {
        const idx = firstIndexWithError((errors as any)?.goals);
        if (idx == null) return;

        setOpen(String(idx));

        requestAnimationFrame(() => {
            document.getElementById(`goal-${idx}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            const goalErr = (errors as any)?.goals?.[idx];
            const field = firstGoalErrorField(goalErr);
            setFocus(`goals.${idx}.${field}` as const);
        });
    }, [errors, setFocus]);

    React.useImperativeHandle(ref, () => ({ openFirstErrorGoal }), [openFirstErrorGoal]);

    const afterMutate = React.useCallback(
        (affectedIndex?: number) => {
            // clear schema + nested errors
            clearErrors("goals");
            if (typeof affectedIndex === "number") {
                clearErrors(`goals.${affectedIndex}` as const);
            }
        },
        [clearErrors]
    );

    const addFromTemplate = React.useCallback(
        (t: GoalTemplate) => {
            const newIndex = fields.length;

            append(
                {
                    id: crypto.randomUUID(),
                    name: t.name,
                    targetAmount: t.targetAmount,
                    targetDate: t.targetDate ?? "",
                    amountSaved: null,
                },
                { shouldFocus: false }
            );

            setOpen(String(newIndex));
            closeModal();
            afterMutate();
        },
        [append, fields.length, closeModal, afterMutate]
    );

    const addBlank = React.useCallback(() => {
        const newIndex = fields.length;

        append(
            {
                id: crypto.randomUUID(),
                name: "",
                targetAmount: null,
                targetDate: "",
                amountSaved: null,
            },
            { shouldFocus: false }
        );


        clearErrors([`goals.${newIndex}` as const, "goals"]);

        setOpen(String(newIndex));
        closeModal();
    }, [
        append,
        fields.length,
        closeModal,
        clearErrors,
    ]);

    const removeAt = React.useCallback(
        (index: number) => {
            remove(index);

            setOpen((cur) => {
                if (!cur) return "";
                const curIdx = Number(cur);
                if (!Number.isFinite(curIdx)) return "";
                if (curIdx === index) return "";
                if (curIdx > index) return String(curIdx - 1);
                return cur;
            });

            afterMutate();
        },
        [remove, afterMutate]
    );

    const isEmpty = fields.length === 0;
    return (
        <WizardCard>
            <GoalTemplateModal
                isOpen={isTemplateOpen}
                onClose={closeModal}
                onSelect={addFromTemplate}
                onSelectBlank={addBlank}
            />

            <AnimatePresence mode="wait">
                {isEmpty ? (
                    <motion.div
                        key={goalsHaveBeenSet ? "empty-used" : "empty-first"}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                    >
                        <PiggyBank size={48} className="mx-auto text-darkLimeGreen" />

                        <h4 className="mt-4 text-xl font-semibold text-wizard-text">
                            {goalsHaveBeenSet ? "Inga aktiva sparmål" : "Dags att sätta upp dina sparmål!"}
                        </h4>

                        <p className="mt-2 max-w-md mx-auto text-wizard-text/60">
                            {goalsHaveBeenSet
                                ? "Vill du lägga till ett nytt mål?"
                                : "En resa, en buffert eller en kontantinsats — välj en mall eller börja från noll."}
                        </p>

                        <button
                            type="button"
                            onClick={() => openModal("goalTemplate")}
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-darkLimeGreen px-5 py-2.5 text-sm font-semibold text-wizard-text shadow-lg transition hover:scale-105 hover:bg-limeGreen focus:outline-none focus:ring-2 focus:ring-limeGreen/70"
                        >
                            <PlusCircle size={20} /> {goalsHaveBeenSet ? "Lägg till sparmål" : "Lägg till första målet"}
                        </button>

                        {!goalsHaveBeenSet && (
                            <p className="mt-4 text-sm text-wizard-text/50">
                                Har du inga sparmål just nu? Inga problem — du kan lägga till dem senare.
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
                            {deferredFields.map((f, index) => (
                                visibleIndexSet.has(index) ? (
                                <motion.div
                                    id={`goal-${index}`}
                                    key={f.fieldId}
                                    layout
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-2xl"
                                >
                                    <SavingsGoalItemAccordion index={index} onRemove={removeAt} />
                                </motion.div>
                                ) : null
                            ))}
                        </WizardAccordionRoot>
                        {compactListMode && (
                            <div className="rounded-xl border border-wizard-stroke/25 bg-wizard-surface/30 px-4 py-3 text-sm text-wizard-text/75">
                                {deferredFields.length - visibleIndexSet.size} mål är tillfälligt komprimerade för bättre prestanda.
                                <button
                                    type="button"
                                    onClick={() => setShowAllGoals(true)}
                                    className="ml-2 font-semibold text-wizard-accent hover:underline"
                                >
                                    Visa alla mål
                                </button>
                            </div>
                        )}

                        <div className="relative flex justify-center">
                            <div className="pointer-events-none absolute inset-0 grid place-items-center">
                                <div className="h-10 w-44 rounded-full bg-wizard-accent/10 blur-2xl" />
                            </div>
                            <button
                                type="button"
                                onClick={() => openModal("goalTemplate")}
                                className="inline-flex items-center gap-2 rounded-xl px-5 py-3
                                    bg-wizard-accent text-white font-semibold
                                    shadow-sm shadow-black/10
                                    hover:brightness-[1.02] active:brightness-[0.98]
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/35"
                            >
                                <PlusCircle size={20} className="text-wizard-accent-foreground/95" />
                                Lägg till mål
                            </button>
                        </div>
                    </motion.div>

                )}
            </AnimatePresence>
        </WizardCard>
    );
});

export default SavingsGoalsCard;

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

function firstGoalErrorField(goalErr: any): "name" | "targetAmount" | "targetDate" | "amountSaved" {
    if (goalErr?.name) return "name";
    if (goalErr?.targetAmount) return "targetAmount";
    if (goalErr?.targetDate) return "targetDate";
    return "amountSaved";
}
