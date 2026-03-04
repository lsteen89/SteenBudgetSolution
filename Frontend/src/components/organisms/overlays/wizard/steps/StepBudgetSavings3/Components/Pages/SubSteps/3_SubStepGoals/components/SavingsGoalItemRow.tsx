import { motion } from "framer-motion";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";

import RowNumberInput from "@components/atoms/InputField/RowNumberInput";
import RowTextInput from "@components/atoms/InputField/RowTextInput";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { idFromPath } from "@/utils/idFromPath";
import { formatMoneyPartsV2, formatMoneyV2 } from "@/utils/money/moneyV2";

import { useWizard } from "@/context/WizardContext";
import useAnimatedCounter from "@/hooks/useAnimatedCounter";
import {
  calcProgress,
  calculateMonthlyContribution,
} from "@/utils/budget/financialCalculations";

type Props = { index: number };

export default function SavingsGoalItemRow({ index }: Props) {
  const { control, watch } = useFormContext<Step3FormValues>();
  const currency = useAppCurrency();
  const locale = useAppLocale();
  const currencyLabel = formatMoneyPartsV2(0, currency, { locale }).currency;

  const base = `goals.${index}` as const;

  const targetAmount = watch(`${base}.targetAmount`);
  const amountSaved = watch(`${base}.amountSaved`);
  const targetDateString = watch(`${base}.targetDate`);
  const deferredTargetAmount = useDeferredValue(targetAmount);
  const deferredAmountSaved = useDeferredValue(amountSaved);
  const deferredTargetDateString = useDeferredValue(targetDateString);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const blurTimerRef = useRef<number | null>(null);

  const markEditingStart = useCallback(() => {
    if (blurTimerRef.current != null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setIsEditingGoal(true);
  }, []);

  const markEditingEnd = useCallback(() => {
    if (blurTimerRef.current != null) {
      window.clearTimeout(blurTimerRef.current);
    }
    blurTimerRef.current = window.setTimeout(() => {
      setIsEditingGoal(false);
    }, 120);
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current != null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const dateObject = useMemo(() => {
    if (!deferredTargetDateString) return null;
    const ymd = String(deferredTargetDateString).split("T")[0];
    const d = new Date(ymd);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [deferredTargetDateString]);

  const monthly = calculateMonthlyContribution(
    deferredTargetAmount,
    deferredAmountSaved,
    dateObject,
  );
  const progress = calcProgress(deferredTargetAmount, deferredAmountSaved);
  const animatedMonthly = useAnimatedCounter(monthly ?? 0, 500, !isEditingGoal);

  const money0 = useMemo(
    () => (n: number) =>
      formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const { validationAttempted } = useWizard();
  const showErrors = validationAttempted["step3.goals"] === true;

  return (
    <>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-6">
        {/* Name */}
        <div className="md:col-span-6">
          <label
            htmlFor={idFromPath(`${base}.name`)}
            className="mb-1.5 block text-xs font-semibold text-wizard-text/70"
          >
            Målets namn
          </label>

          <Controller
            name={`${base}.name`}
            control={control}
            render={({ field, fieldState }) => (
              <RowTextInput
                id={idFromPath(`${base}.name`)}
                placeholder="T.ex. Resa till Sicilien"
                value={field.value ?? ""}
                onChange={field.onChange}
                onFocus={markEditingStart}
                onBlur={() => {
                  field.onBlur();
                  markEditingEnd();
                }}
                error={fieldState.error?.message}
                touched={fieldState.isTouched}
                showError={showErrors}
              />
            )}
          />
        </div>

        {/* Target amount */}
        <div className="md:col-span-3">
          <label
            htmlFor={idFromPath(`${base}.targetAmount`)}
            className="mb-1.5 block text-xs font-semibold text-wizard-text/70"
          >
            Målbelopp ({currencyLabel})
          </label>

          <Controller
            name={`${base}.targetAmount`}
            control={control}
            render={({ field, fieldState }) => (
              <RowNumberInput
                id={idFromPath(`${base}.targetAmount`)}
                placeholder="50 000"
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
                onFocus={markEditingStart}
                onBlur={() => {
                  field.onBlur();
                  markEditingEnd();
                }}
                error={fieldState.error?.message}
                touched={fieldState.isTouched}
                showError={showErrors}
                currency={currency}
                locale={locale}
              />
            )}
          />
        </div>

        {/* Amount saved */}
        <div className="md:col-span-3">
          <label
            htmlFor={idFromPath(`${base}.amountSaved`)}
            className="mb-1.5 block text-xs font-semibold text-wizard-text/70"
          >
            Redan sparat ({currencyLabel})
          </label>

          <Controller
            name={`${base}.amountSaved`}
            control={control}
            render={({ field, fieldState }) => (
              <RowNumberInput
                id={idFromPath(`${base}.amountSaved`)}
                placeholder="Valfritt"
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
                onFocus={markEditingStart}
                onBlur={() => {
                  field.onBlur();
                  markEditingEnd();
                }}
                error={fieldState.error?.message}
                touched={fieldState.isTouched}
                showError={showErrors}
                currency={currency}
                locale={locale}
              />
            )}
          />
        </div>

        {/* Date */}
        <div className="md:col-span-4">
          <label
            htmlFor={idFromPath(`${base}.targetDate`)}
            className="mb-1.5 block text-xs font-semibold text-wizard-text/70"
          >
            Måldatum
          </label>

          <Controller
            name={`${base}.targetDate`}
            control={control}
            render={({ field, fieldState }) => {
              const dateValue = field.value
                ? String(field.value).split("T")[0]
                : "";
              return (
                <RowTextInput
                  id={idFromPath(`${base}.targetDate`)}
                  type="date"
                  value={dateValue}
                  onChange={field.onChange}
                  onFocus={markEditingStart}
                  onBlur={() => {
                    field.onBlur();
                    markEditingEnd();
                  }}
                  error={fieldState.error?.message}
                  touched={fieldState.isTouched}
                  showError={showErrors}
                />
              );
            }}
          />
        </div>
      </div>

      {/* Progress (accent is allowed here) */}
      <div className="mt-6 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-wizard-stroke/15">
          <motion.div
            layout={!isEditingGoal}
            className="h-full rounded-full bg-wizard-accent"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-wizard-text/75">
          <span>
            Sparat:{" "}
            <span className="font-semibold text-wizard-text tabular-nums">
              {money0(Number(amountSaved ?? 0))}
            </span>
          </span>
          <span className="tabular-nums">{progress}% klart</span>
        </div>

        {monthly !== null ? (
          <p className="text-sm text-wizard-text/80">
            Månadssparande:
            <span className="ml-1.5 font-semibold text-wizard-text tabular-nums">
              {money0(animatedMonthly)} /mån
            </span>
          </p>
        ) : null}
      </div>
    </>
  );
}
