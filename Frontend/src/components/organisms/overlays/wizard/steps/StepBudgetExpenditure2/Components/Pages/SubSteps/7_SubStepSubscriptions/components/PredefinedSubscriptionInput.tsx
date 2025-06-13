import React from "react";
import { useFormContext } from "react-hook-form";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import { idFromPath } from "@/utils/idFromPath";
import type { SubscriptionsSubForm } from "../SubStepSubscriptions";

type PredefinedKey = keyof Omit<SubscriptionsSubForm, 'customSubscriptions'>;

interface PredefinedSubscriptionInputProps {
  name: PredefinedKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const PredefinedSubscriptionInput: React.FC<PredefinedSubscriptionInputProps> = ({ name, label, Icon }) => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<{ subscriptions: SubscriptionsSubForm }>();

  const value = watch(`subscriptions.${name}`);
  const errorMsg = (errors.subscriptions as any)?.[name]?.message;

  return (
    <div className="bg-white/10 rounded-xl shadow-inner transition-all duration-200 hover:bg-white/20 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Icon className="w-5 h-5 text-darkBlueMenuColor" />
        <label htmlFor={`subscriptions.${name}`} className="text-sm text-white font-semibold flex-shrink min-w-0">
          {label}
        </label>
        <HelpSection label="" className="flex-shrink-0 ml-auto" helpText="Ange din månadskostnad" />
      </div>
      <div className="mt-auto w-full flex justify-center">
        <FormattedNumberInput
          id={idFromPath(`subscriptions.${name}`)}
          value={value ?? null}
          onValueChange={(val) =>
            setValue(`subscriptions.${name}`, val ?? null, { shouldValidate: true, shouldDirty: true })
          }
          placeholder="Belopp"
          error={errorMsg}
          name={`subscriptions.${name}`}
          className="w-full max-w-[200px] sm:max-w-xs"
        />
      </div>
    </div>
  );
};

export default PredefinedSubscriptionInput;
