import React, { useEffect, useMemo, useState } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { CreditCard, PlusCircle } from "lucide-react";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import { Separator } from "@/components/ui/separator";

import { idFromPath } from "@/utils/idFromPath";
import type { SubscriptionsSubForm } from "@/types/Wizard/Step2_Expenditure/SubscriptionsFormValues";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { setValueAsSvNumber } from "@/utils/forms/parseNumber";

import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import {
  WizardAccordion,
  WizardAccordionRoot,
} from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import IcedCustomItemRow from "@components/organisms/overlays/wizard/SharedComponents/InputRows/IcedCustomItemRow";

import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";
import { sumMoney } from "@/utils/money/moneyMath";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type FormShape = { subscriptions: SubscriptionsSubForm };
type SuggestedFieldName = Exclude<keyof SubscriptionsSubForm, "customSubscriptions">;

type SuggestedField = {
  name: SuggestedFieldName;
  label: string;
  placeholder: string;
  helpText: string;
};

const SUGGESTED_FIELDS: SuggestedField[] = [
  {
    name: "netflix",
    label: "Netflix",
    placeholder: "t.ex. 149",
    helpText: "Månadskostnad för Netflix.",
  },
  {
    name: "spotify",
    label: "Spotify",
    placeholder: "t.ex. 119",
    helpText: "Månadskostnad för Spotify.",
  },
  {
    name: "hbomax",
    label: "HBO Max",
    placeholder: "t.ex. 109",
    helpText: "Månadskostnad för HBO Max.",
  },
  {
    name: "viaplay",
    label: "Viaplay",
    placeholder: "t.ex. 149",
    helpText: "Månadskostnad för Viaplay.",
  },
  {
    name: "disneyPlus",
    label: "Disney+",
    placeholder: "t.ex. 89",
    helpText: "Månadskostnad för Disney+.",
  },
];

const SubStepSubscriptions: React.FC = () => {
  const { control, setFocus, clearErrors, getFieldState, formState, register } =
    useFormContext<FormShape>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const [openAccordion, setOpenAccordion] = useState<string>("custom");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subscriptions.customSubscriptions",
    keyName: "fieldId",
    shouldUnregister: false,
  });

  // suggested
  const netflix = useWatch({ control, name: "subscriptions.netflix" });
  const spotify = useWatch({ control, name: "subscriptions.spotify" });
  const hbomax = useWatch({ control, name: "subscriptions.hbomax" });
  const viaplay = useWatch({ control, name: "subscriptions.viaplay" });
  const disneyPlus = useWatch({ control, name: "subscriptions.disneyPlus" });

  // custom
  const customSubscriptions =
    useWatch({ control, name: "subscriptions.customSubscriptions" }) ?? [];

  const suggestedTotal = useMemo(
    () => sumMoney(netflix, spotify, hbomax, viaplay, disneyPlus),
    [netflix, spotify, hbomax, viaplay, disneyPlus]
  );

  const customTotal = useMemo(() => {
    return customSubscriptions.reduce((acc, item) => acc + sumMoney(item?.cost), 0);
  }, [customSubscriptions]);

  const total = suggestedTotal + customTotal;

  const customTotalText = useMemo(() => {
    return customTotal > 0
      ? formatMoneyV2(customTotal, currency, locale, { fractionDigits: 0 })
      : undefined;
  }, [customTotal, currency, locale]);

  const handleAddSubscription = () => {
    setOpenAccordion("custom");
    append({ name: "", cost: null });
    setTimeout(
      () => setFocus(`subscriptions.customSubscriptions.${fields.length}.name`),
      0
    );
  };

  // Open accordion if custom array has errors
  useEffect(() => {
    if (formState.errors.subscriptions?.customSubscriptions) setOpenAccordion("custom");
  }, [formState.errors.subscriptions?.customSubscriptions]);

  // Clear stale errors when empty & clean
  useEffect(() => {
    const items = customSubscriptions ?? [];
    const hasIncomplete = items.some(
      (item) => item && (item.cost ?? null) !== null && !item.name?.trim()
    );
    if (items.length === 0 && !hasIncomplete) {
      clearErrors("subscriptions.customSubscriptions");
    }
  }, [customSubscriptions, clearErrors]);

  const err = (path: Parameters<typeof getFieldState>[0]) =>
    getFieldState(path, formState).error?.message;

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <WizardStepHeader
          stepPill={{ stepNumber: 2, majorLabel: "Utgifter", subLabel: "Prenumerationer" }}
          title="Prenumerationer"
          subtitle="Lägg in streaming och andra prenumerationer du betalar varje månad."
          guardrails={[
            { emphasis: "Räkningar", to: "annat steg", detail: "(internet/telefoni)" },
            { emphasis: "Spontanköp", to: "kommer senare", detail: "(mat/nöjen)" },
          ]}
          helpTitle="Vad räknas som prenumerationer?"
          helpItems={[
            "Streaming, musik, appar och digitala medlemskap.",
            "Om du är osäker: lägg in det som en egen prenumeration så blir det rätt i totalen.",
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUGGESTED_FIELDS.map((field) => {
            const path = `subscriptions.${field.name}` as const;

            return (
              <NumberInput
                key={path}
                label={field.label}
                currency={currency}
                locale={locale}
                placeholder={field.placeholder}
                error={err(path)}
                {...register(path, { setValueAs: setValueAsSvNumber })}
              />
            );
          })}
        </div>

        <Separator className="bg-white/20 my-6" />

        <WizardAccordionRoot
          type="single"
          collapsible
          value={openAccordion}
          onValueChange={setOpenAccordion}
        >
          <span id={idFromPath("subscriptions.customSubscriptions")} className="block h-0" />

          <WizardAccordion
            value="custom"
            icon={<CreditCard className="h-5 w-5 text-wizard-accent" />}
            title="Egna prenumerationer"
            subtitle="Lägg till dina egna tjänster och månadskostnader."
            totalText={customTotalText}
            totalSuffix="/mån"
            variant="shell"
            count={fields.length}
            onAdd={handleAddSubscription}
            addLabel="Lägg till prenumeration"
            addPlacement="inside"
          >
            <div className="space-y-3 pt-2">
              {fields.map((item, index) => (
                <IcedCustomItemRow
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
                  namePlaceholder="Namn (t.ex. iCloud)"
                  amountPlaceholder="Belopp"
                />
              ))}
            </div>

            {typeof formState.errors.subscriptions?.customSubscriptions?.message === "string" && (
              <p className="mt-2 text-center text-sm font-semibold text-wizard-warning">
                {formState.errors.subscriptions.customSubscriptions.message}
              </p>
            )}
          </WizardAccordion>
        </WizardAccordionRoot>


        <div className="pt-6">
          <WizardTotalBar
            title="Totalt prenumerationer"
            subtitle="Summa för prenumerationer per månad"
            value={total}
            currency={currency}
            locale={locale}
            suffix="/mån"
            tone="accent"
          />
        </div>
      </section>
    </div>
  );
};

export default SubStepSubscriptions;
