import React, { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { PlusCircle, PiggyBank } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { FormValues } from "@/types/budget/goalTypes";
import OptionContainer from "@/components/molecules/containers/OptionContainer";
import GoalItem from "@/components/organisms/goals/GoalItem";
import InfoBox from "@/components/molecules/messaging/InfoBox"; 
import GoalContainer from "@/components/molecules/containers/GoalContainer";
import FormErrorSummary from "@/components/molecules/messaging/FormErrorSummary";
import { GoalTemplateModal } from "@/components/modals/GoalTemplateModal";
import { GoalTemplate } from "@/components/modals/goalTemplates"; 
import { useWizard } from '@/context/WizardContext';

const SubStepGoals = () => {
  const { control, getValues, formState: { errors }, } = useFormContext<FormValues>(); 
  const { fields, append, remove } = useFieldArray({
    control,
    name: "goals",
    keyName: "fieldId",
    shouldUnregister: true,
  });

  const { isActionBlocked, setIsActionBlocked } = useWizard();

  // This is for when they pick a template.
  const handleSelectTemplate = (template: GoalTemplate) => {
    append({
      id: crypto.randomUUID(),
      name: template.name,
      targetAmount: template.targetAmount,
      targetDate: template.targetDate, 
      amountSaved: null,
    });
    setIsActionBlocked(false);
  };

  // This is for the wise guy who wants to start from scratch. Respect.
  const handleSelectBlank = () => {
    append({ id: crypto.randomUUID(), name: "", targetAmount: null, targetDate: "", amountSaved: null });
    setIsActionBlocked(false);
  };

  return (
    <OptionContainer className="p-1 md:p-4">
      <GoalTemplateModal
          isOpen={isActionBlocked} 
          onClose={() => setIsActionBlocked(false)} 
          onSelect={handleSelectTemplate}
          onSelectBlank={handleSelectBlank}
        />
        <section className="mx-auto w-full max-w-5xl space-y-10 py-10 px-0 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-darkLimeGreen">
            <PiggyBank className="mb-1 inline" size={26} /> Sparmål
          </h3>
        </div>

        <InfoBox>
          Här lägger du till dina sparmål. Ge varje mål ett namn, välj hur mycket du vill spara och när du vill ha det klart. Vi räknar automatiskt ut hur mycket du behöver lägga undan varje månad.
        </InfoBox>
        
        <FormErrorSummary errors={errors} name="goals" />
        <div id="goals" style={{ height: 0 }} />

        <motion.div layout className="flex flex-col gap-y-6">
            <AnimatePresence>
                {/* AND WE STICK TO THE WASTE MANAGEMENT PLAN.
                  The parent, this component, provides the container for each item.
                */}
                {fields.map((item, index) => (
                    <GoalContainer
                        key={item.fieldId}
                        layout
                        variants={{
                            initial: { opacity: 0, y: 20 },
                            animate: { opacity: 1, y: 0 },
                            exit: { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0, transition: { duration: 0.3 } },
                        }}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="p-4 text-center sm:p-8 md:p-12"
                    >
                        <GoalItem
                            item={item}
                            index={index}
                            onRemove={remove}
                        />
                    </GoalContainer>
                ))}

                {fields.length === 0 && (
              <GoalContainer
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="p-4 sm:p-6"
              >
                <div className="flex flex-col items-center justify-center text-center">
                    <PiggyBank size={48} className="mx-auto text-darkLimeGreen" />
                    <h4 className="mt-4 text-xl font-semibold text-white">Dags att sätta upp dina sparmål!</h4>
                    <p className="mt-2 max-w-md text-white/60">
                        Vad drömmer du om? En resa, en ny bil, eller en buffert? Klicka på knappen för att lägga till ditt första mål.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsActionBlocked(true)}
                        className="mt-6 flex items-center gap-2 rounded-2xl bg-darkLimeGreen px-5 py-2.5 text-sm font-semibold text-black shadow-lg transition hover:scale-105 hover:bg-limeGreen focus:outline-none focus:ring-2 focus:ring-limeGreen/70"
                    >
                        <PlusCircle size={20} /> Lägg till första målet
                    </button>
                    <p className="mt-4 text-sm text-white/50">
                      Har du inga sparmål just nu? 
                      <br />
                      Inga problem!
                      <br />
                      Du kan lägga till dem senare.
                  </p>
                </div>
            </GoalContainer>
          )}
          </AnimatePresence>
        </motion.div>

        {fields.length > 0 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsActionBlocked(true)}
              className="flex items-center gap-2 rounded-2xl bg-darkLimeGreen px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:scale-105 hover:bg-limeGreen focus:outline-none focus:ring-2 focus:ring-limeGreen/70"
            >
              <PlusCircle size={20} /> Lägg till mål
            </button>
          </div>
        )}
      </section>
    </OptionContainer>
  );
};

export default SubStepGoals;

