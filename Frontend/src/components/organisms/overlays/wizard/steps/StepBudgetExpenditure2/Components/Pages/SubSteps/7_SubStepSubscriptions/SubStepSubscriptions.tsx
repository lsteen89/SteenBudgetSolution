import React, { useEffect, useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { PlusCircle } from "lucide-react";
import { SiNetflix, SiSpotify, SiHbo, SiViaplay } from "react-icons/si";
import { TbBrandDisney } from "react-icons/tb";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import GlossyFlipCard from "@components/molecules/cards/GlossyFlipCard/GlossyFlipCard";
import FlipCardText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/text/FlipCardText";
import PredefinedSubscriptionInput from "./components/PredefinedSubscriptionInput";
import CustomItemRow from "@components/organisms/overlays/wizard/SharedComponents/InputRows/CustomItemRow";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import useMediaQuery from "@hooks/useMediaQuery";
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
  { key: "disneyPlus" as const, label: "Disney+", icon: TbBrandDisney },
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
            {predefinedSubs.map((sub) => (
              <motion.div key={sub.key} layout>
                <PredefinedSubscriptionInput name={sub.key} label={sub.label} Icon={sub.icon} />
              </motion.div>
            ))}
          </div>

          <Separator className="bg-white/20" />

          <Accordion type="single" collapsible defaultValue="custom">
            <AccordionItem value="custom">
              <AccordionTrigger className="text-lg font-semibold text-white hover:no-underline focus:outline-none py-3" id={idFromPath("subscriptions.customSubscriptions")}>Egna Prenumerationer</AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-4">
                <div className="flex justify-end">
                  <button type="button" onClick={handleAdd} className="flex items-center gap-2 px-3 py-1 bg-limeGreen text-black rounded-md">
                    <PlusCircle size={18} /> Lägg till
                  </button>
                </div>
                <div className="space-y-4">
                  {fields.map((item, index) => (
                    <CustomItemRow
                      key={item.fieldId}
                      basePath="subscriptions.customSubscriptions"
                      index={index}
                      fieldId={item.fieldId}
                      isDeleting={item.fieldId === deletingId}
                      onStartDelete={() => setDeletingId(item.fieldId)}
                      onRemove={() => {
                        remove(index);
                        setDeletingId(null);
                      }}
                    />
                  ))}
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
