import { ReceiptText } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Separator } from "@/components/ui/separator";
import type { FixedExpensesSubForm } from "@/types/Wizard/Step2_Expenditure/FixedExpensesFormValues";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import NumberInput from "@components/atoms/InputField/NumberInput";
import {
  WizardAccordion,
  WizardAccordionRoot,
} from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import IcedCustomItemRow from "@components/organisms/overlays/wizard/SharedComponents/InputRows/IcedCustomItemRow";

import { sumMoney } from "@/utils/money/moneyMath";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import WizardTotalBar from "@components/organisms/overlays/wizard/SharedComponents/Sections/WizardTotalBar";

import { tDict } from "@/utils/i18n/translate";
import { subStepFixedExpensesDict } from "@/utils/i18n/wizard/stepExpenditure/SubStepFixedExpenses.i18n";

type FormShape = { fixedExpenses: FixedExpensesSubForm };
type SuggestedFieldName = Exclude<keyof FixedExpensesSubForm, "customExpenses">;

type SuggestedField = {
  name: SuggestedFieldName;
  label: string;
  placeholder: string;
  helpText: string;
};

const buildSuggestedFields = (
  t: <K extends keyof typeof subStepFixedExpensesDict.sv>(k: K) => string,
): SuggestedField[] => [
  {
    name: "insurance",
    label: t("insuranceLabel"),
    placeholder: t("insurancePlaceholder"),
    helpText: t("insuranceHelp"),
  },
  {
    name: "internet",
    label: t("internetLabel"),
    placeholder: t("internetPlaceholder"),
    helpText: t("internetHelp"),
  },
  {
    name: "phone",
    label: t("phoneLabel"),
    placeholder: t("phonePlaceholder"),
    helpText: t("phoneHelp"),
  },
  {
    name: "gym",
    label: t("gymLabel"),
    placeholder: t("gymPlaceholder"),
    helpText: t("gymHelp"),
  },
];

const SubStepFixedExpenses: React.FC = () => {
  const { control, setFocus, clearErrors, getFieldState, formState, register } =
    useFormContext<FormShape>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof subStepFixedExpensesDict.sv>(k: K) =>
    tDict(k, locale, subStepFixedExpensesDict);

  const SUGGESTED_FIELDS = useMemo(() => buildSuggestedFields(t), [t]);

  const [openAccordion, setOpenAccordion] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fixedExpenses.customExpenses",
    keyName: "fieldId",
    shouldUnregister: false,
  });

  const insurance = useWatch({ control, name: "fixedExpenses.insurance" });
  const internet = useWatch({ control, name: "fixedExpenses.internet" });
  const phone = useWatch({ control, name: "fixedExpenses.phone" });
  const gym = useWatch({ control, name: "fixedExpenses.gym" });

  const customExpenses =
    useWatch({ control, name: "fixedExpenses.customExpenses" }) ?? [];

  const suggestedTotal = useMemo(
    () => sumMoney(insurance, internet, phone, gym),
    [insurance, internet, phone, gym],
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
    if (formState.errors.fixedExpenses?.customExpenses)
      setOpenAccordion("custom");
  }, [formState.errors.fixedExpenses?.customExpenses]);

  useEffect(() => {
    const items = customExpenses ?? [];
    const hasIncomplete = items.some(
      (item) => item && (item.cost ?? null) !== null && !item.name?.trim(),
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
          stepPill={{
            stepNumber: 4,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          subtitle={t("subtitle")}
          guardrails={[
            {
              emphasis: t("guardSubsEmphasis"),
              to: t("guardSubsTo"),
              detail: t("guardSubsDetail"),
            },
            {
              emphasis: t("guardCarInsuranceEmphasis"),
              to: t("guardCarInsuranceTo"),
            },
          ]}
          helpTitle={t("helpTitle")}
          helpItems={[t("help1"), t("help2")]}
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
                {...register(path, { setValueAs: setValueAsLocalizedNumber })}
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
            title={t("customTitle")}
            icon={
              <ReceiptText className="w-6 h-6 text-wizard-text flex-shrink-0" />
            }
            totalText={customTotalText}
            totalSuffix={t("totalSuffix")}
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
                  namePlaceholder={t("customRowNamePlaceholder")}
                  amountPlaceholder={t("customRowAmountPlaceholder")}
                />
              ))}
            </div>

            {typeof formState.errors.fixedExpenses?.customExpenses?.message ===
              "string" && (
              <p className="mt-3 text-xs font-semibold text-wizard-warning text-center">
                {formState.errors.fixedExpenses.customExpenses.message}
              </p>
            )}
          </WizardAccordion>
        </WizardAccordionRoot>

        <div className="pt-6">
          <WizardTotalBar
            title={t("totalTitle")}
            subtitle={t("totalSubtitle")}
            value={total}
            currency={currency}
            locale={locale}
            suffix={t("totalSuffix")}
            tone="accent"
          />
        </div>
      </section>
    </div>
  );
};

export default SubStepFixedExpenses;
