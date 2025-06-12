import React, { useEffect, useState } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import { PlusCircle, Trash2 } from "lucide-react";
import { SiNetflix, SiSpotify, SiHbo, SiViaplay, SiDisneyplus } from "react-icons/si";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import GlossyFlipCard from "@components/molecules/cards/GlossyFlipCard/GlossyFlipCard";
import FlipCardText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/text/FlipCardText";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import TextInput from "@components/atoms/InputField/TextInput";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import useMediaQuery from "@hooks/useMediaQuery";
import useScrollToFirstError from "@/hooks/useScrollToFirstError";
import { idFromPath } from "@/utils/idFromPath";

export interface SubscriptionItem {
  id?: string;
  name?: string;
  cost?: number | null;
}

export interface SubscriptionsSubForm {
  netflix?: number | null;
  spotify?: number | null;
  hbomax?: number | null;
  viaplay?: number | null;
  disneyPlus?: number | null;
  customSubscriptions?: (SubscriptionItem | undefined)[];
}

const predefinedSubs = [
  { key: "netflix" as const, label: "Netflix", icon: SiNetflix },
  { key: "spotify" as const, label: "Spotify", icon: SiSpotify },
  { key: "hbomax" as const, label: "HBO Max", icon: SiHbo },
  { key: "viaplay" as const, label: "Viaplay", icon: SiViaplay },
  { key: "disneyPlus" as const, label: "Disney+", icon: SiDisneyplus },
];

const SubStepSubscriptions: React.FC = () => {
  const {
    control,
    watch,
    setValue,
    setFocus,
    clearErrors,
    formState: { errors },
  } = useFormContext<{ subscriptions: SubscriptionsSubForm }>();

  useScrollToFirstError(errors);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subscriptions.customSubscriptions",
    keyName: "fieldId",
    shouldUnregister: true,
  });

  const handleAdd = () => {
    append({ name: "", cost: null });
    setTimeout(() => {
      setFocus(`subscriptions.customSubscriptions.${fields.length}.name`);
    }, 0);
  };

  const isMdScreenOrUp = useMediaQuery("(min-width: 768px)");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const customVals = watch("subscriptions.customSubscriptions");

  useEffect(() => {
    const items = customVals ?? [];
    const hasIncomplete = items.some(
      (i) => i && (!i.name?.trim() || !i.cost || i.cost <= 0)
    );
    if (items.length === 0 && !hasIncomplete) clearErrors("subscriptions.customSubscriptions");
  }, [customVals, clearErrors]);

  const total = (
    (watch("subscriptions.netflix") ?? 0) +
    (watch("subscriptions.spotify") ?? 0) +
    (watch("subscriptions.hbomax") ?? 0) +
    (watch("subscriptions.viaplay") ?? 0) +
    (watch("subscriptions.disneyPlus") ?? 0) +
    (customVals?.reduce((a, c) => a + (c?.cost ?? 0), 0) ?? 0)
  );
  const formattedTotal = total.toLocaleString("sv-SE");

  const itemVariants = {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, x: -300 },
  };

  return (
    <OptionContainer>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <div className="flex justify-center md:mt-4">
          <GlossyFlipCard
            frontText={<FlipCardText pageKey="subscriptions" variant="front" />}
            backText={<FlipCardText pageKey="subscriptions" variant="back" />}
            frontTextClass="text-lg text-white"
            backTextClass="text-sm text-limeGreen"
            disableBounce={true}
            containerClassName="w-[170px] h-[400px] md:w-[350px] md:h-[270px]"
          />
        </div>

        <div className="bg-white/5 rounded-2xl shadow-xl p-3 md:p-6 mt-8 max-w-2xl mx-auto space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {predefinedSubs.map((sub) => {
              const Icon = sub.icon;
              return (
                <motion.div
                  key={sub.key}
                  layout
                  className="bg-white/10 rounded-xl shadow-inner transition-all duration-200 hover:bg-white/20 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-5 h-5 text-darkBlueMenuColor" />
                    <label htmlFor={`subscriptions.${sub.key}`} className="text-sm text-white font-semibold flex-shrink min-w-0">
                      {sub.label}
                    </label>
                    <HelpSection label="" className="flex-shrink-0 ml-auto" helpText="Ange din månadskostnad" />
                  </div>
                  <div className="mt-auto w-full flex justify-center">
                    <FormattedNumberInput
                      id={idFromPath(`subscriptions.${sub.key}`)}
                      value={watch(`subscriptions.${sub.key}`) ?? null}
                      onValueChange={(val) => setValue(`subscriptions.${sub.key}`, val ?? null, { shouldValidate: true, shouldDirty: true })}
                      placeholder="Belopp"
                      error={errors.subscriptions?.[sub.key]?.message}
                      name={`subscriptions.${sub.key}`}
                      className="w-full max-w-[200px] sm:max-w-xs"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Separator className="bg-white/20" />

          <Accordion type="single" collapsible>
            <AccordionItem value="custom">
              <AccordionTrigger className="text-lg font-semibold text-white hover:no-underline focus:outline-none py-3" id={idFromPath("subscriptions.customSubscriptions")}>Egna Prenumerationer</AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-4">
                <div className="flex justify-end">
                  <button type="button" onClick={handleAdd} className="flex items-center gap-2 px-3 py-1 bg-limeGreen text-black rounded-md">
                    <PlusCircle size={18} /> Lägg till
                  </button>
                </div>
                <div className="space-y-4">
                  {fields.map((item, index) => {
                    const isDeleting = item.fieldId === deletingId;
                    return (
                      <motion.div
                        key={item.fieldId}
                        layout
                        variants={itemVariants}
                        initial="initial"
                        animate={isDeleting ? "exit" : "animate"}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onAnimationComplete={() => {
                          if (isDeleting) {
                            remove(index);
                            setDeletingId(null);
                          }
                        }}
                        className="flex flex-col md:flex-row items-center gap-3 p-3 bg-white/5 rounded-lg overflow-hidden"
                      >
                        <div className="flex-grow w-full md:w-auto">
                          <Controller
                            name={`subscriptions.customSubscriptions.${index}.name` as const}
                            control={control}
                            defaultValue={item.name || ""}
                            render={({ field, fieldState }) => (
                              <TextInput
                                id={idFromPath(`subscriptions.customSubscriptions.${index}.name`)}
                                placeholder="Namn"
                                {...field}
                                value={field.value ?? ""}
                                error={fieldState.error?.message}
                                className="w-full"
                              />
                            )}
                          />
                        </div>
                        <div className="w-full md:w-auto md:max-w-[160px]">
                          <FormattedNumberInput
                            id={idFromPath(`subscriptions.customSubscriptions.${index}.cost`)}
                            value={watch(`subscriptions.customSubscriptions.${index}.cost`) ?? null}
                            onValueChange={(val) => setValue(`subscriptions.customSubscriptions.${index}.cost`, val ?? null, { shouldValidate: true, shouldDirty: true })}
                            placeholder="Belopp"
                            error={errors.subscriptions?.customSubscriptions?.[index]?.cost?.message}
                            name={`subscriptions.customSubscriptions.${index}.cost`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.fieldId)}
                          disabled={deletingId !== null}
                          aria-label="Ta bort prenumeration"
                          className="p-2 bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-white rounded-lg flex items-center justify-center self-center md:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={18} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
                {typeof errors.subscriptions?.customSubscriptions?.message === "string" && (
                  <p className="mt-2 text-red-600 text-sm text-center">
                    {errors.subscriptions.customSubscriptions.message}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator className="bg-white/20" />

          <div className="pt-2">
            <motion.p
              key={formattedTotal}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center text-xl font-bold text-white"
            >
              {isMdScreenOrUp ? 'Totala prenumerationer: ' : <>Totala prenume­rationer: </>}
              <span className="tracking-wide">{formattedTotal} kr</span>
            </motion.p>
            {errors.subscriptions && typeof errors.subscriptions.message === "string" && (
              <p className="mt-2 text-red-600 text-l text-center">{errors.subscriptions.message}</p>
            )}
          </div>
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepSubscriptions;
