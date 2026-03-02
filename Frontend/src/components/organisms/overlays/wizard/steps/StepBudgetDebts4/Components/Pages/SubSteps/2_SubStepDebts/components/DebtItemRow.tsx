import { Controller, useFormContext, useWatch } from "react-hook-form";

import { useWizard } from "@/context/WizardContext";
import type { Step4FormValues } from "@/types/Wizard/Step4_Debt/Step4FormValues";
import { idFromPath } from "@/utils/idFromPath";

import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import RowNumberInput from "@components/atoms/InputField/RowNumberInput";
import RowTextInput from "@components/atoms/InputField/RowTextInput";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { formatMoneyPartsV2 } from "@/utils/money/moneyV2";

type Props = { index: number };

export default function DebtItemRow({ index }: Props) {
  const { control } = useFormContext<Step4FormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const currencyLabel = formatMoneyPartsV2(0, currency, { locale }).currency;

  const base = `debts.${index}` as const;

  const { validationAttempted } = useWizard();
  const showErrors = validationAttempted["step4.debts"] === true;

  const type = useWatch({ control, name: `${base}.type` }) as
    | "installment"
    | "revolving"
    | "private"
    | "bank_loan";

  const selectClass =
    "w-full h-11 rounded-xl px-3 bg-wizard-surface border border-wizard-stroke/25 " +
    "text-wizard-text shadow-sm shadow-black/5 transition-colors " +
    "hover:border-wizard-stroke/35 focus:outline-none focus:ring-2 " +
    "focus:border-wizard-stroke/40 focus:ring-wizard-accent/30";

  const labelClass = "block text-xs font-semibold text-wizard-text/70 mb-1.5";

  return (
    <div className="grid grid-cols-1 gap-y-4">
      {/* A) Name + Type */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor={idFromPath(`${base}.name`)} className={labelClass}>
            Skuldens namn
          </label>

          <Controller
            name={`${base}.name`}
            control={control}
            render={({ field, fieldState }) => (
              <RowTextInput
                id={idFromPath(`${base}.name`)}
                placeholder="SBAB Bolån, Amex…"
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
            Typ
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
                  Banklån (Bolån, Billån, Privatlån)
                </option>
                <option value="revolving">Kreditkort / Kontokredit</option>
                <option value="installment">
                  Avbetalning (Klarna, Snabblån)
                </option>
                <option value="private">Privat lån (Familj, Vänner)</option>
              </select>
            )}
          />
        </div>
      </div>

      {/* B) Balance + APR (2-up on mobile) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={idFromPath(`${base}.balance`)} className={labelClass}>
            Restbelopp ({currencyLabel})
          </label>

          <Controller
            name={`${base}.balance`}
            control={control}
            render={({ field, fieldState }) => (
              <RowNumberInput
                id={idFromPath(`${base}.balance`)}
                placeholder="25 000"
                value={field.value ?? ""}
                onChange={(e) => {
                  const parsed = setValueAsSvNumber(e.target.value);
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
            Ränta (%)
          </label>

          <Controller
            name={`${base}.apr`}
            control={control}
            render={({ field, fieldState }) => (
              <RowNumberInput
                id={idFromPath(`${base}.apr`)}
                placeholder="8.5"
                value={field.value ?? ""} // keep as string during typing
                onChange={field.onChange} // ✅ don’t parse here
                onBlur={(e) => {
                  field.onBlur();
                  const parsed = setValueAsSvNumber(e.target.value);
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

      {/* C) Conditional section (soft panel so it feels intentional) */}
      {type === "installment" ||
      type === "bank_loan" ||
      type === "revolving" ? (
        <div
          className={cn(
            "mt-1 rounded-2xl border border-wizard-stroke/20",
            "bg-wizard-surface-accent/35",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            "p-4",
          )}
        >
          <p className="text-[11px] font-semibold text-wizard-text/60 uppercase tracking-wide">
            Extra uppgifter
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(type === "installment" || type === "bank_loan") && (
              <div>
                <label
                  htmlFor={idFromPath(`${base}.termMonths`)}
                  className={labelClass}
                >
                  Löptid (mån)
                </label>

                <Controller
                  name={`${base}.termMonths`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <RowNumberInput
                      id={idFromPath(`${base}.termMonths`)}
                      placeholder="36"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const parsed = setValueAsSvNumber(e.target.value);
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

            {(type === "installment" || type === "bank_loan") && (
              <div>
                <label
                  htmlFor={idFromPath(`${base}.monthlyFee`)}
                  className={labelClass}
                >
                  Månadsavgift ({currencyLabel})
                </label>

                <Controller
                  name={`${base}.monthlyFee`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <RowNumberInput
                      id={idFromPath(`${base}.monthlyFee`)}
                      placeholder="29"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const parsed = setValueAsSvNumber(e.target.value);
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
                  Minsta betalning ({currencyLabel})
                </label>

                <Controller
                  name={`${base}.minPayment`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <RowNumberInput
                      id={idFromPath(`${base}.minPayment`)}
                      placeholder="500"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const parsed = setValueAsSvNumber(e.target.value);
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
