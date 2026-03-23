import { CreditCard } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Separator } from "@/components/ui/separator";

import type { SubscriptionsSubForm } from "@/types/Wizard/Step2_Expenditure/SubscriptionsFormValues";
import { idFromPath } from "@/utils/idFromPath";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import { tDict } from "@/utils/i18n/translate";
import { subStepSubscriptionsDict } from "@/utils/i18n/wizard/stepExpenditure/SubStepSubscriptions.i18n";
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

type FormShape = { subscriptions: SubscriptionsSubForm };
type SuggestedFieldName = Exclude<
  keyof SubscriptionsSubForm,
  "customSubscriptions"
>;

type SuggestedField = {
  name: SuggestedFieldName;
  label: string;
  placeholder: string;
  helpText: string;
};

const SubStepSubscriptions: React.FC = () => {
  const { control, setFocus, clearErrors, getFieldState, formState, register } =
    useFormContext<FormShape>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const dictLocale = locale.startsWith("sv")
    ? "sv"
    : locale.startsWith("et")
      ? "et"
      : "en";
  const t = <K extends keyof typeof subStepSubscriptionsDict.sv>(k: K) =>
    tDict(k, locale, subStepSubscriptionsDict);
  type SuggestedField = {
    name: SuggestedFieldName;
    label: string;
    placeholder: string;
  };
  const SUGGESTED_FIELDS: SuggestedField[] = [
    { name: "netflix", label: "Netflix", placeholder: "e.g. 15" },
    { name: "spotify", label: "Spotify", placeholder: "e.g. 12" },
    { name: "hbomax", label: "HBO Max", placeholder: "e.g. 11" },
    { name: "viaplay", label: "Viaplay", placeholder: "e.g. 15" },
    { name: "disneyPlus", label: "Disney+", placeholder: "e.g. 9" },
  ];

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
    [netflix, spotify, hbomax, viaplay, disneyPlus],
  );

  const customTotal = useMemo(() => {
    return customSubscriptions.reduce(
      (acc, item) => acc + sumMoney(item?.cost),
      0,
    );
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
      0,
    );
  };

  // Open accordion if custom array has errors
  useEffect(() => {
    if (formState.errors.subscriptions?.customSubscriptions)
      setOpenAccordion("custom");
  }, [formState.errors.subscriptions?.customSubscriptions]);

  // Clear stale errors when empty & clean
  useEffect(() => {
    const items = customSubscriptions ?? [];
    const hasIncomplete = items.some(
      (item) => item && (item.cost ?? null) !== null && !item.name?.trim(),
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
          stepPill={{
            stepNumber: 2,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title={t("title")}
          subtitle={t("subtitle")}
          guardrails={[
            {
              emphasis: t("guardrailBillsEmphasis"),
              to: t("guardrailBillsTo"),
              detail: t("guardrailBillsDetail"),
            },
          ]}
          helpTitle={t("helpTitle")}
          helpItems={[t("help1"), t("help2")]}
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
          onValueChange={setOpenAccordion}
        >
          <span
            id={idFromPath("subscriptions.customSubscriptions")}
            className="block h-0"
          />

          <WizardAccordion
            value="custom"
            icon={<CreditCard className="h-5 w-5 text-wizard-accent" />}
            title={t("customTitle")}
            subtitle={t("customSubtitle")}
            totalSuffix={t("totalSuffix")}
            addLabel={t("addLabel")}
            variant="shell"
            count={fields.length}
            onAdd={handleAddSubscription}
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
                  namePlaceholder={t("namePlaceholder")}
                  amountPlaceholder={t("amountPlaceholder")}
                />
              ))}
            </div>

            {typeof formState.errors.subscriptions?.customSubscriptions
              ?.message === "string" && (
              <p className="mt-2 text-center text-sm font-semibold text-wizard-warning">
                {formState.errors.subscriptions.customSubscriptions.message}
              </p>
            )}
          </WizardAccordion>
        </WizardAccordionRoot>

        <div className="pt-6">
          <WizardTotalBar
            title={t("totalTitle")}
            subtitle={t("totalSubtitle")}
            suffix={t("totalSuffix")}
            value={total}
            currency={currency}
            locale={locale}
            tone="accent"
          />
        </div>
      </section>
    </div>
  );
};

export default SubStepSubscriptions;
