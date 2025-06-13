import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import TextInput from "@components/atoms/InputField/TextInput";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import { idFromPath } from "@/utils/idFromPath";
import type { SubscriptionsSubForm } from "../SubStepSubscriptions";

interface CustomSubscriptionRowProps {
  index: number;
  fieldId: string;
  isDeleting: boolean;
  onStartDelete: () => void;
  onRemove: () => void;
}

const CustomSubscriptionRow: React.FC<CustomSubscriptionRowProps> = ({ index, fieldId, isDeleting, onStartDelete, onRemove }) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<{ subscriptions: SubscriptionsSubForm }>();

  return (
    <motion.div
      layout
      variants={{ initial: { opacity: 0, scale: 0.8, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.8, x: -300 } }}
      initial="initial"
      animate={isDeleting ? "exit" : "animate"}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onAnimationComplete={() => { if (isDeleting) onRemove(); }}
      className="flex flex-col md:flex-row items-center gap-3 p-3 bg-white/5 rounded-lg overflow-hidden"
    >
      <div className="flex-grow w-full md:w-auto">
        <Controller
          name={`subscriptions.customSubscriptions.${index}.name` as const}
          control={control}
          defaultValue=""
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
          error={(errors.subscriptions?.customSubscriptions as any)?.[index]?.cost?.message}
          name={`subscriptions.customSubscriptions.${index}.cost`}
        />
      </div>
      <button
        type="button"
        onClick={onStartDelete}
        aria-label="Ta bort prenumeration"
        className="p-2 bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-white rounded-lg flex items-center justify-center self-center md:self-auto"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
};

export default CustomSubscriptionRow;
