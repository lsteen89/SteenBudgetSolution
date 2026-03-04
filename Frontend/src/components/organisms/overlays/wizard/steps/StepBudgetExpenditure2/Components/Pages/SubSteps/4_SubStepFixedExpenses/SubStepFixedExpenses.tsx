import React, { useEffect, useMemo, useState } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { PlusCircle, ReceiptText } from "lucide-react";

import OptionContainer from "@components/molecules/containers/OptionContainer";
import { Separator } from "@/components/ui/separator";

import { idFromPath } from "@/utils/idFromPath";
import type { FixedExpensesSubForm } from "@/types/Wizard/Step2_Expenditure/FixedExpensesFormValues";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { WizardAccordion, WizardAccordionRoot } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import IcedCustomItemRow from "@components/organisms/overlays/wizard/SharedComponents/InputRows/IcedCustomItemRow";

import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";
import { sumMoney } from "@/utils/money/moneyMath";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { cn } from "@/lib/utils";

type FormShape = { fixedExpenses: FixedExpensesSubForm };
type SuggestedFieldName = Exclude<keyof FixedExpensesSubForm, "customExpenses">;

type SuggestedField = {
  name: SuggestedFieldName;
  label: string;
  placeholder: string;
  helpText: string;
};

const SUGGESTED_FIELDS: SuggestedField[] = [
  {
    name: "insurance",
    label: "Försäkring",
    placeholder: "t.ex. 300",
    helpText:
      "Hem/boende- och personförsäkringar (t.ex. hem, liv). Bilförsäkring fylls i under Transport.",
  },
  { name: "internet", label: "Internet", placeholder: "t.ex. 400", helpText: "Månadskostnad för bredband/uppkoppling." },
  { name: "phone", label: "Telefoni", placeholder: "t.ex. 250", helpText: "Månadskostnad för mobil/telefoni." },
  { name: "gym", label: "Träning / medlemskap", placeholder: "t.ex. 200", helpText: "Gym eller andra medlemskap." },
];

const SubStepFixedExpenses: React.FC = () => {
  const { control, setFocus, clearErrors, getFieldState, formState, register } =
    useFormContext<FormShape>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const [openAccordion, setOpenAccordion] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fixedExpenses.customExpenses",
    keyName: "fieldId",
    shouldUnregister: false,
  });

  // suggested
  const insurance = useWatch({ control, name: "fixedExpenses.insurance" });
  const internet = useWatch({ control, name: "fixedExpenses.internet" });
  const phone = useWatch({ control, name: "fixedExpenses.phone" });
  const gym = useWatch({ control, name: "fixedExpenses.gym" });

  // custom
  const customExpenses = useWatch({ control, name: "fixedExpenses.customExpenses" }) ?? [];

  const suggestedTotal = useMemo(
    () => sumMoney(insurance, internet, phone, gym),
    [insurance, internet, phone, gym]
  );

  const customTotal = useMemo(() => {
    return customExpenses.reduce((acc, item) => acc + sumMoney(item?.cost), 0);
  }, [customExpenses]);

  const total = suggestedTotal + customTotal;

  const customTotalText = useMemo(() => {
    return customTotal > 0
      ? formatMoneyV2(customTotal, currency, locale, { fractionDigits: 0 })
      : undefined;
  }, [customTotal, currency, locale]);


  useEffect(() => {
    if (formState.errors.fixedExpenses?.customExpenses) setOpenAccordion("custom");
  }, [formState.errors.fixedExpenses?.customExpenses]);

  useEffect(() => {
    const items = customExpenses ?? [];
    const hasIncomplete = items.some(
      (item) => item && (item.cost ?? null) !== null && !item.name?.trim()
    );
    if (items.length === 0 && !hasIncomplete) {
      clearErrors("fixedExpenses.customExpenses");
    }
  }, [customExpenses, clearErrors]);

  const err = (path: Parameters<typeof getFieldState>[0]) =>
    getFieldState(path, formState).error?.message;

  const handleAddExpense = () => {
    setOpenAccordion("custom");
    const nextIndex = fields.length;
    append({ name: "", cost: null });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFocus(`fixedExpenses.customExpenses.${nextIndex}.name`);
      });
    });
  };

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe">
        <WizardStepHeader
          title=""
          stepPill={{ stepNumber: 4, majorLabel: "Utgifter", subLabel: "Räkningar & nödvändigheter" }}
          subtitle="Lägg in räkningar du betalar de flesta månader. Du kan alltid justera dessa senare."
          guardrails={[
            { emphasis: "Prenumerationer", to: "eget steg", detail: "(Netflix/Spotify)" },
            { emphasis: "Bilförsäkring", to: "Transport" },
          ]}
          helpTitle='Vad räknas som “räkningar” här?'
          helpItems={[
            "Hemförsäkring, internet, telefoni, gym/medlemskap.",
            "Sånt som varierar mycket (mat, spontanköp) kommer i andra steg.",
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUGGESTED_FIELDS.map((field) => {
            const path = `fixedExpenses.${field.name}` as const;

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
          onValueChange={(value) => setOpenAccordion(value ?? "")}
        >
          <WizardAccordion
            value="custom"
            variant="shell"
            title="Egna räkningar"
            icon={<ReceiptText className="w-6 h-6 text-wizard-text flex-shrink-0" />}
            totalText={customTotalText}
            totalSuffix="/mån"
            count={fields.length}
            onAdd={handleAddExpense}
          >
            <div className="space-y-3">
              {fields.map((item, index) => (
                <IcedCustomItemRow
                  key={item.fieldId}
                  basePath="fixedExpenses.customExpenses"
                  index={index}
                  fieldId={item.fieldId}
                  isDeleting={item.fieldId === deletingId}
                  onStartDelete={() => setDeletingId(item.fieldId)}
                  onRemove={() => {
                    remove(index);
                    setDeletingId(null);
                  }}
                  namePlaceholder="Namn på räkning (t.ex. förskola)"
                  amountPlaceholder="Belopp"
                />
              ))}
            </div>

            {typeof formState.errors.fixedExpenses?.customExpenses?.message === "string" && (
              <p className="mt-3 text-xs font-semibold text-wizard-warning text-center">
                {formState.errors.fixedExpenses.customExpenses.message}
              </p>
            )}
          </WizardAccordion>
        </WizardAccordionRoot>

        <div className="pt-6">
          <WizardTotalBar
            title="Totalt räkningar"
            subtitle="Summa för räkningar & egna räkningar per månad"
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

export default SubStepFixedExpenses;
