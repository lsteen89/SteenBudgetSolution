import React, { useEffect, useState } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import TextInput from "@components/atoms/InputField/TextInput";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import GlossyFlipCard from "@components/molecules/cards/GlossyFlipCard/GlossyFlipCard";
import FlipCardText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/text/FlipCardText";
import useMediaQuery from '@hooks/useMediaQuery';
import { idFromPath } from "@/utils/idFromPath";
import useScrollToFirstError from "@/hooks/useScrollToFirstError";
import CustomItemRow from "@components/organisms/overlays/wizard/SharedComponents/InputRows/CustomItemRow";


export interface FixedExpenseItem {
  id?: string;
  name?: string;
  fee?: number | null;
}

export interface FixedExpensesSubForm {
  insurance?: number | null;
  electricity?: number | null;
  internet?: number | null;
  phone?: number | null;
  unionFees?: number | null;
  customExpenses?: (FixedExpenseItem | undefined)[];
}

const SubStepFixedExpenses: React.FC = () => {
  const {
    control,
    watch,
    setValue,
    setFocus,
    trigger,
    clearErrors,
    formState: { errors, submitCount },
  } = useFormContext<{ fixedExpenses: FixedExpensesSubForm }>();

  useScrollToFirstError(errors);
  
  const [openAccordion, setOpenAccordion] = useState<string>("custom");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fixedExpenses.customExpenses",
    keyName: "fieldId",
    shouldUnregister: true,
  });

  const handleAddExpense = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    append({ name: "", fee: null });
    setTimeout(() => {
      setFocus(`fixedExpenses.customExpenses.${fields.length}.name`);
    }, 0);
  };

  
  const isMdScreenOrUp = useMediaQuery('(min-width: 768px)');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const insuranceVal = watch("fixedExpenses.insurance");
  const electricityVal = watch("fixedExpenses.electricity");
  const internetVal = watch("fixedExpenses.internet");
  const phoneVal = watch("fixedExpenses.phone");
  const unionFeesVal = watch("fixedExpenses.unionFees");
  const customExpensesVal = watch("fixedExpenses.customExpenses");

  const calculatedTotalValue =
    (insuranceVal ?? 0) +
    (electricityVal ?? 0) +
    (internetVal ?? 0) +
    (phoneVal ?? 0) +
    (unionFeesVal ?? 0) +
    (customExpensesVal?.reduce((acc, expenseItem) => acc + (expenseItem?.fee ?? 0), 0) ?? 0);

  const formattedTotalValue = calculatedTotalValue.toLocaleString("sv-SE");

  const commonExpenseFields = [
    { name: "insurance" as const, label: "Försäkringar", placeholder: "t.ex. 300 kr", helpText: "Ett samlat månadssnitt på dina försäkringar. Exempelvis hemförsäkring, bilförsäkring, livsförsäkring." },
    { name: "electricity" as const, label: "El", placeholder: "t.ex. 500 kr", helpText: "..." },
    { name: "internet" as const, label: "Internet", placeholder: "t.ex. 400 kr", helpText: "Din månadskostnad för all form av bredband" },
    { name: "phone" as const, label: "Telefoni", placeholder: "t.ex. 250 kr", helpText: "Din månadskostnad för alla typer av telefoni du betalar för" },
    { name: "unionFees" as const, label: "Fackförenings-\navgift", placeholder: "t.ex. 350 kr", helpText: "Om du är med i ett fack och/eller A-kassa kan du ange det här." },
  ];

  const itemVariants = {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, x: -300 },
  };

  useEffect(() => {
    if (errors.fixedExpenses?.customExpenses) setOpenAccordion("custom");
  }, [errors.fixedExpenses?.customExpenses]);

  useEffect(() => {
    const items = customExpensesVal ?? [];
    const hasIncompleteItems = items.some(
      (item) => item && (!item.name?.trim() || !item.fee || item.fee <= 0)
    );

    // If there are no items, or if all items are valid, clear any array-level errors.
    if (items.length === 0 && !hasIncompleteItems) {
      clearErrors("fixedExpenses.customExpenses");
    }
  }, [customExpensesVal, clearErrors]);


  return (
    <OptionContainer>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <div className="flex justify-center md:mt-4">
          <GlossyFlipCard
            frontText={<FlipCardText pageKey="fixedExpenses" variant="front" />}
            backText={<FlipCardText pageKey="fixedExpenses" variant="back" />}
            frontTextClass="text-lg text-white"
            backTextClass="text-sm text-limeGreen"
            disableBounce={true}
            containerClassName="w-[170px] h-[400px] md:w-[350px] md:h-[270px]"
          />
        </div>

        <div className="bg-white/5 rounded-2xl shadow-xl p-3 md:p-6 mt-8 max-w-2xl mx-auto space-y-6">
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
            {commonExpenseFields.map((field) => (
              <motion.div
                key={field.name}
                layout
                className="bg-white/10 rounded-xl shadow-inner transition-all duration-200 hover:bg-white/20 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center gap-1">
                  <label htmlFor={`fixedExpenses.${field.name}`} className="text-sm text-white font-semibold flex-shrink min-w-0">
                    {field.label}
                  </label>
                  <HelpSection label="" className="flex-shrink-0 ml-auto" helpText={field.helpText} />
                </div>
                <div className="mt-auto w-full flex justify-center">
                  <FormattedNumberInput
                    id={idFromPath(`fixedExpenses.${field.name}`)}
                    value={watch(`fixedExpenses.${field.name}`) ?? null}
                    onValueChange={(val) => setValue(`fixedExpenses.${field.name}`, val ?? null, { shouldValidate: true, shouldDirty: true })}
                    placeholder={field.placeholder}
                    error={errors.fixedExpenses?.[field.name]?.message}
                    name={`fixedExpenses.${field.name}`}
                    className="w-full max-w-[200px] sm:max-w-xs"
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <Separator className="bg-white/20" />

          <Accordion type="single" collapsible value={openAccordion} onValueChange={setOpenAccordion}>
             <span id={idFromPath("fixedExpenses.customExpenses")} className="block h-0" />
            {/* anchor for scroll-to-first-error */}

            <AccordionItem value="custom">
              <AccordionTrigger className="text-lg font-semibold text-white hover:no-underline focus:outline-none py-3"
              id={idFromPath("fixedExpenses.customExpenses")}>
              
                
                Egna Fasta Utgifter
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    className="flex items-center gap-2 px-3 py-1 bg-limeGreen text-black rounded-md"
                  >
                    <PlusCircle size={18} /> Lägg till
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((item, index) => (
                    <CustomItemRow
                      key={item.fieldId}
                      basePath="fixedExpenses.customExpenses"
                      amountKey="fee"
                      index={index}
                      fieldId={item.fieldId}
                      isDeleting={item.fieldId === deletingId}
                      onStartDelete={() => setDeletingId(item.fieldId)}
                      onRemove={() => {
                        remove(index);
                        setDeletingId(null);
                      }}
                      namePlaceholder="Namn på utgift (t.ex. Streaming, Gym)"
                    />
                  ))}
                </div>

                {/* validation message */}
                {typeof errors.fixedExpenses?.customExpenses?.message === "string" && (
                  <p className="mt-2 text-red-600 text-sm text-center">
                    {errors.fixedExpenses.customExpenses.message}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator className="bg-white/20" />

          <div className="pt-2">
            <motion.p
              key={formattedTotalValue}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center text-xl font-bold text-white"
            >
              {isMdScreenOrUp ? 'Totala Fasta Månadskostnader: ' : <>Totala Fasta Månads-&shy;kostnader: </>}
              <span className="tracking-wide">{formattedTotalValue} kr</span>
            </motion.p>
            {errors.fixedExpenses && typeof errors.fixedExpenses.message === "string" && (
              <p className="mt-2 text-red-600 text-l text-center">
                {errors.fixedExpenses.message}
              </p>
            )}
          </div>
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepFixedExpenses;