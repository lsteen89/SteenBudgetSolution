import { Controller, useFormContext, useWatch } from "react-hook-form";

import { useWizard } from "@/context/WizardContext";
import type { Step4FormValues } from "@/types/Wizard/Step4_Debt/Step4FormValues";
import { idFromPath } from "@/utils/idFromPath";

import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import RowNumberInput from "@components/atoms/InputField/RowNumberInput";
import RowTextInput from "@components/atoms/InputField/RowTextInput";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { debtItemRowDict } from "@/utils/i18n/wizard/stepDebt/DebtItemRow.i18n";
import { formatMoneyPartsV2 } from "@/utils/money/moneyV2";

type Props = { index: number };

type DebtType =
  | "installment"
  | "revolving"
  | "private"
  | "bank_loan"
  | "mortgage"
  | "car_loan";

export default function DebtItemRow({ index }: Props) {
  const { control } = useFormContext<Step4FormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof debtItemRowDict.sv>(k: K) =>
    tDict(k, locale, debtItemRowDict);

  const currencyLabel = formatMoneyPartsV2(0, currency, { locale }).currency;
  const base = `debts.${index}` as const;

  const { validationAttempted } = useWizard();
  const showErrors = validationAttempted["step4.debts"] === true;

  const type = useWatch({ control, name: `${base}.type` }) as DebtType;

  const isAmortizedLike =
    type === "installment" ||
    type === "bank_loan" ||
    type === "mortgage" ||
    type === "car_loan";

  const selectClass =
    "w-full h-11 rounded-xl px-3 bg-wizard-surface border border-wizard-stroke/25 " +
    "text-wizard-text shadow-sm shadow-black/5 transition-colors " +
    "hover:border-wizard-stroke/35 focus:outline-none focus:ring-2 " +
    "focus:border-wizard-stroke/40 focus:ring-wizard-accent/30";

  const labelClass = "block text-xs font-semibold text-wizard-text/70 mb-1.5";

  return (
    <div className="grid grid-cols-1 gap-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor={idFromPath(`${base}.name`)} className={labelClass}>
            {t("debtNameLabel")}
          </label>

          <Controller
            name={`${base}.name`}
            control={control}
            render={({ field, fieldState }) => (
              <RowTextInput
                id={idFromPath(`${base}.name`)}
                placeholder={t("debtNamePlaceholder")}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                touched={fieldState.isTouched}
                showError={showErrors}
              />
            )}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor={idFromPath(`${base}.type`)} className={labelClass}>
            {t("typeLabel")}
          </label>

          <Controller
            name={`${base}.type`}
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id={idFromPath(`${base}.type`)}
                className={selectClass}
              >
                <option value="bank_loan">
                  {t("typeBankLoan")} — {t("typeBankLoanHint")}
                </option>
                <option value="mortgage">
                  {t("typeMortgage")} — {t("typeMortgageHint")}
                </option>
                <option value="car_loan">
                  {t("typeCarLoan")} — {t("typeCarLoanHint")}
                </option>
                <option value="revolving">
                  {t("typeRevolving")} — {t("typeRevolvingHint")}
                </option>
                <option value="installment">
                  {t("typeInstallment")} — {t("typeInstallmentHint")}
                </option>
                <option value="private">
                  {t("typePrivate")} — {t("typePrivateHint")}
                </option>
              </select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={idFromPath(`${base}.balance`)} className={labelClass}>
            {t("balanceLabel")} ({currencyLabel})
          </label>

          <Controller
            name={`${base}.balance`}
            control={control}
            render={({ field, fieldState }) => (
              <RowNumberInput
                id={idFromPath(`${base}.balance`)}
                placeholder={t("balancePlaceholder")}
                value={field.value ?? ""}
                onChange={(e) => {
                  const parsed = setValueAsLocalizedNumber(e.target.value);
                  const next =
                    parsed === null
                      ? null
                      : Number.isFinite(parsed)
                        ? parsed
                        : null;
                  field.onChange(next);
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                touched={fieldState.isTouched}
                showError={showErrors}
                currency={currency}
                locale={locale}
              />
            )}
          />
        </div>

        <div>
          <label htmlFor={idFromPath(`${base}.apr`)} className={labelClass}>
            {t("aprLabel")}
          </label>

          <Controller
            name={`${base}.apr`}
            control={control}
            render={({ field, fieldState }) => (
              <RowNumberInput
                id={idFromPath(`${base}.apr`)}
                placeholder={t("aprPlaceholder")}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={(e) => {
                  field.onBlur();
                  const parsed = setValueAsLocalizedNumber(e.target.value);
                  field.onChange(
                    parsed === null
                      ? null
                      : Number.isFinite(parsed)
                        ? parsed
                        : null,
                  );
                }}
                error={fieldState.error?.message}
                touched={fieldState.isTouched}
                showError={showErrors}
              />
            )}
          />
        </div>
      </div>

      {isAmortizedLike || type === "revolving" ? (
        <div
          className={cn(
            "mt-1 rounded-2xl border border-wizard-stroke/20",
            "bg-wizard-surface-accent/35",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            "p-4",
          )}
        >
          <p className="text-[11px] font-semibold text-wizard-text/60 uppercase tracking-wide">
            {t("extraDetails")}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isAmortizedLike && (
              <div>
                <label
                  htmlFor={idFromPath(`${base}.termMonths`)}
                  className={labelClass}
                >
                  {t("termMonthsLabel")}
                </label>

                <Controller
                  name={`${base}.termMonths`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <RowNumberInput
                      id={idFromPath(`${base}.termMonths`)}
                      placeholder={t("termMonthsPlaceholder")}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const parsed = setValueAsLocalizedNumber(
                          e.target.value,
                        );
                        const next =
                          parsed === null
                            ? null
                            : Number.isFinite(parsed)
                              ? Math.trunc(parsed)
                              : null;
                        field.onChange(next);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      touched={fieldState.isTouched}
                      showError={showErrors}
                    />
                  )}
                />
              </div>
            )}

            {isAmortizedLike && (
              <div>
                <label
                  htmlFor={idFromPath(`${base}.monthlyFee`)}
                  className={labelClass}
                >
                  {t("monthlyFeeLabel")} ({currencyLabel})
                </label>

                <Controller
                  name={`${base}.monthlyFee`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <RowNumberInput
                      id={idFromPath(`${base}.monthlyFee`)}
                      placeholder={t("monthlyFeePlaceholder")}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const parsed = setValueAsLocalizedNumber(
                          e.target.value,
                        );
                        const next =
                          parsed === null
                            ? null
                            : Number.isFinite(parsed)
                              ? parsed
                              : null;
                        field.onChange(next);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      touched={fieldState.isTouched}
                      showError={showErrors}
                      currency={currency}
                      locale={locale}
                    />
                  )}
                />
              </div>
            )}

            {type === "revolving" && (
              <div className="sm:col-span-2">
                <label
                  htmlFor={idFromPath(`${base}.minPayment`)}
                  className={labelClass}
                >
                  {t("minPaymentLabel")} ({currencyLabel})
                </label>

                <Controller
                  name={`${base}.minPayment`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <RowNumberInput
                      id={idFromPath(`${base}.minPayment`)}
                      placeholder={t("minPaymentPlaceholder")}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const parsed = setValueAsLocalizedNumber(
                          e.target.value,
                        );
                        const next =
                          parsed === null
                            ? null
                            : Number.isFinite(parsed)
                              ? parsed
                              : null;
                        field.onChange(next);
                      }}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      touched={fieldState.isTouched}
                      showError={showErrors}
                      currency={currency}
                      locale={locale}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
