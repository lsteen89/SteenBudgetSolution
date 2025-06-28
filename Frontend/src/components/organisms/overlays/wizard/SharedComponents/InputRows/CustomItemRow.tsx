import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import get from "lodash/get";

import TextInput from "@components/atoms/InputField/TextInput";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import { idFromPath } from "@/utils/idFromPath";

interface CustomItemRowProps {
  /** Base path to the array in form state, e.g. "subscriptions.customSubscriptions" */
  basePath: string;
  /** Index of the item in the array */
  index: number;
  /** Unique id used for animation keying */
  fieldId: string;
  /** Name of the numeric property. Defaults to "cost". */
  amountKey?: string;
  /** Placeholder for name input */
  namePlaceholder?: string;
  /** Placeholder for amount input */
  amountPlaceholder?: string;
  /** Is row being deleted */
  isDeleting: boolean;
  /** Trigger when delete button pressed */
  onStartDelete: () => void;
  /** Called after animation completes */
  onRemove: () => void;
}

const CustomItemRow: React.FC<CustomItemRowProps> = ({
  basePath,
  index,
  fieldId,
  namePlaceholder = "Namn",
  amountPlaceholder = "Belopp",
  isDeleting,
  onStartDelete,
  onRemove,
}) => {
  const { control, formState: { errors } } = useFormContext<any>();

  const namePath = `${basePath}.${index}.name`;
  const amountPath = `${basePath}.${index}.cost`;

  return (
    <motion.div
      layout
      variants={{ initial: { opacity: 0, scale: 0.8, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.8, x: -300 } }}
      initial="initial"
      animate={isDeleting ? "exit" : "animate"}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onAnimationComplete={() => { if (isDeleting) onRemove(); }}
      className="flex flex-col md:flex-row items-center gap-3 p-3 bg-white/5 rounded-lg overflow-hidden"
 >
      <div className="flex-grow w-full md:w-auto">
        {/* The 'name' field was already perfect. It stays the same. */}
        <Controller
          name={namePath}
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextInput
              id={idFromPath(namePath)}
              placeholder={namePlaceholder}
              {...field}
              value={field.value ?? ""}
              error={get(errors, namePath)?.message as string | undefined}
              className="w-full"
            />
          )}
        />
      </div>
      <div className="w-full md:w-auto md:max-w-[160px]">
        <Controller
          name={amountPath}
          control={control}
          defaultValue={null} // A safe, pure default for a nullable number
          render={({ field }) => (
            <FormattedNumberInput
              id={idFromPath(amountPath)}
              placeholder={amountPlaceholder}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              name={field.name}
              error={get(errors, amountPath)?.message as string | undefined}
            />
          )}
        />
      </div>
      <button
        type="button"
        onClick={onStartDelete}
        aria-label="Ta bort"
        className="p-2 bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-white rounded-lg flex items-center justify-center self-center md:self-auto"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
};

export default CustomItemRow;
