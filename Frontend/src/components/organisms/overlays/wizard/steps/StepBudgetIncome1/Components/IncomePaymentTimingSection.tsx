import React, { useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";

import WizardSelect from "@components/atoms/InputField/WizardSelect";
import {
  WizardRadioCardGroup,
  type WizardRadioOption,
} from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardRadioCardGroup";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  IncomeFormValues,
  IncomePaymentDayType,
} from "@/types/Wizard/Step1_Income/IncomeFormValues";
import { tDict } from "@/utils/i18n/translate";
import { wizardIncomeDict } from "@/utils/i18n/wizard/stepIncome/StepIncome.i18n";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, index) => {
  const value = String(index + 1);

  return {
    value,
    label: value,
  };
});

const IncomePaymentTimingSection: React.FC = () => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardIncomeDict.sv>(key: K) =>
    tDict(key, locale, wizardIncomeDict);

  const { control, formState, setValue, clearErrors } =
    useFormContext<IncomeFormValues>();

  const { field: paymentDayTypeField, fieldState: paymentDayTypeState } =
    useController({
      control,
      name: "incomePaymentDayType",
    });

  const { field: paymentDayField, fieldState: paymentDayState } = useController(
    {
      control,
      name: "incomePaymentDay",
    },
  );

  const showErrors = formState.submitCount > 0;
  const selectedType = (paymentDayTypeField.value ?? null) as IncomePaymentDayType | null;
  const showDaySelect = selectedType === "dayOfMonth";

  const paymentDayTypeOptions = useMemo<
    WizardRadioOption<IncomePaymentDayType>[]
  >(
    () => [
      {
        value: "dayOfMonth",
        label: t("paymentTimingOptionDayOfMonth"),
      },
      {
        value: "lastDayOfMonth",
        label: t("paymentTimingOptionLastDay"),
      },
    ],
    [locale],
  );

  const paymentDayTypeError =
    paymentDayTypeState.isTouched || showErrors
      ? paymentDayTypeState.error?.message
      : undefined;

  const paymentDayError =
    paymentDayState.isTouched || showErrors
      ? paymentDayState.error?.message
      : undefined;

  return (
    <section
      className="
        rounded-2xl border border-wizard-stroke/20
        bg-wizard-shell/45 p-5
        shadow-lg shadow-black/5
      "
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-wizard-text/90">
          {t("paymentTimingLabel")}
        </h3>
        <p className="max-w-2xl text-sm leading-relaxed text-wizard-text/65">
          {t("paymentTimingHelper")}
        </p>
      </div>

      <WizardRadioCardGroup<IncomePaymentDayType>
        className="mt-4"
        name={paymentDayTypeField.name}
        value={selectedType}
        options={paymentDayTypeOptions}
        onChange={(value) => {
          paymentDayTypeField.onChange(value);

          if (value === "lastDayOfMonth") {
            setValue("incomePaymentDay", null, {
              shouldDirty: true,
              shouldValidate: true,
            });
            clearErrors("incomePaymentDay");
          }
        }}
        error={paymentDayTypeError}
      />

      {showDaySelect ? (
        <div className="mt-4 max-w-xs">
          <WizardSelect
            id={paymentDayField.name}
            name={paymentDayField.name}
            label={t("paymentTimingDayLabel")}
            value={paymentDayField.value == null ? "" : String(paymentDayField.value)}
            onBlur={paymentDayField.onBlur}
            onChange={(event) => {
              const nextValue = event.target.value;

              paymentDayField.onChange(nextValue === "" ? null : Number(nextValue));
            }}
            error={paymentDayError}
            options={[
              {
                value: "",
                label: t("paymentTimingDayPlaceholder"),
                disabled: true,
                hidden: true,
              },
              ...DAY_OPTIONS,
            ]}
          />
        </div>
      ) : null}
    </section>
  );
};

export default IncomePaymentTimingSection;
