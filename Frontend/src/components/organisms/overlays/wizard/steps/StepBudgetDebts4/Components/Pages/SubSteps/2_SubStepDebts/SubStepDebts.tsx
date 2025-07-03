import React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { PlusCircle, HandCoins } from "lucide-react";

import { DebtsFormValues }   from "@/types/Wizard/DebtFormValues";
import DebtItem              from "@/components/organisms/debts/DebtItem";
import OptionContainer       from "@/components/molecules/containers/OptionContainer";
import DebtContainer         from "@/components/molecules/containers/DebtContainer";
import InfoBox               from "@/components/molecules/messaging/InfoBox";
import FormErrorSummary      from "@/components/molecules/messaging/FormErrorSummary";
import { DebtTemplateModal } from "@/components/modals/DebtTemplateModal";
import { DebtTemplate }      from "@/components/modals/debtTemplates";
import { useWizard }         from "@/context/WizardContext";
import { idFromPath }        from "@/utils/idFromPath"; 

const SubStepDebts: React.FC = () => {
  const { control, getValues, setValue, formState: { errors } } =
    useFormContext<DebtsFormValues>();

  const { fields, append } = useFieldArray({
    control,
    name: "debts",              // array lives directly under `debts`
    keyName: "fieldId",
    shouldUnregister: false,
  });

  const { isActionBlocked, setIsActionBlocked, debtsHaveBeenSet } = useWizard();

  /* ---------- handlers ---------- */
  const handleSelectTemplate = (tpl: DebtTemplate) => {
    append({
      id: crypto.randomUUID(),
      type:           tpl.type,
      name:           tpl.name,
      balance:        tpl.balance,
      apr:            tpl.apr,
      minPayment:     tpl.minPayment ?? null,
      termMonths:     tpl.termMonths ?? null,
    });
    setIsActionBlocked(false);
  };

  const handleSelectBlank = () => {
    append({
      id: crypto.randomUUID(),
      type: "installment", 
      name: "",
      balance: null,
      apr: null,
      minPayment: null,
      termMonths: null,
    });
    setIsActionBlocked(false);
  };

  const removeDebt = (idx: number) => {
    const newDebts = getValues("debts").filter((_, i) => i !== idx);
    setValue("debts", newDebts, { shouldValidate: true, shouldDirty: true });
  };

  /* ---------- ui ---------- */
  return (
    <OptionContainer className="p-1">
      <DebtTemplateModal
        isOpen={isActionBlocked}
        onClose={() => setIsActionBlocked(false)}
        onSelect={handleSelectTemplate}
        onSelectBlank={handleSelectBlank}
      />

      <section className="mx-auto w-full max-w-5xl space-y-10 py-10 px-0 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-darkLimeGreen">
            <HandCoins className="mb-1 inline" size={26} /> Skulder
          </h3>
        </div>

        <InfoBox>
          Lägg till dina skulder. Vi räknar ut månadsbetalningen utifrån belopp,
          ränta och löptid.
        </InfoBox>

        <FormErrorSummary errors={errors} name="debts" />
        {/* Anchor point for smooth scrolling from error summary links */}
        <div id={idFromPath("debts")} style={{ height: 0 }} />

        <motion.div layout className="flex flex-col gap-y-6">
          <AnimatePresence>
            {fields.length === 0 ? (
              <DebtContainer
                key="empty"
                className="p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-white/70">
                  {debtsHaveBeenSet
                    ? "Inga aktiva skulder just nu."
                    : "Du har inga skulder inlagda ännu."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsActionBlocked(true)}
                  className="mt-6 flex items-center gap-2 rounded-2xl bg-darkLimeGreen px-5 py-2.5 text-sm font-semibold text-black shadow-lg transition hover:scale-105 hover:bg-limeGreen focus:outline-none"
                >
                  <PlusCircle size={20} /> Lägg till skuld
                </button>
              </DebtContainer>
            ) : (
              fields.map((item, index) => (
                <DebtContainer
                  key={item.fieldId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 sm:p-8 md:p-12"
                >
                  <DebtItem item={item} index={index} onRemove={removeDebt} />
                </DebtContainer>
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {fields.length > 0 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsActionBlocked(true)}
              className="flex items-center gap-2 rounded-2xl bg-darkLimeGreen px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:scale-105 hover:bg-limeGreen focus:outline-none"
            >
              <PlusCircle size={20} /> Lägg till skuld
            </button>
          </div>
        )}
      </section>
    </OptionContainer>
  );
};

export default SubStepDebts;
