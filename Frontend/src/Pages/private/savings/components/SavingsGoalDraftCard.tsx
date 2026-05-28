import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import {
  buildCreateSavingsGoalFormSchema,
  parseCreateSavingsGoalFormValues,
  suggestMonthlyContribution,
  type CreateSavingsGoalFormValues,
  type SavingsGoalSchemaMessages,
} from "@/schemas/dashboard/monthEditor/savingsGoal.schemas";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { savingsGoalSchemaDict } from "@/utils/i18n/pages/private/savings/SavingsGoalSchema.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useEffect, useMemo, useRef, useState } from "react";

const MONTHLY_HIGH_THRESHOLD = 50_000;

export type SavingsGoalDraftSubmitPayload = {
  name: string;
  targetAmount: number;
  targetDate: string;
  amountSaved: number | null;
  monthlyContribution: number;
};

type SavingsGoalDraftCardProps = {
  isSubmitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (payload: SavingsGoalDraftSubmitPayload) => Promise<void> | void;
};

type FieldErrors = Partial<Record<keyof CreateSavingsGoalFormValues, string>>;

const initialValues: CreateSavingsGoalFormValues = {
  name: "",
  targetAmount: "",
  amountSaved: "",
  targetDate: "",
};

export default function SavingsGoalDraftCard({
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: SavingsGoalDraftCardProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const tSchema = <K extends keyof typeof savingsGoalSchemaDict.sv>(key: K) =>
    tDict(key, locale, savingsGoalSchemaDict);

  const schemaMessages = useMemo<SavingsGoalSchemaMessages>(
    () => ({
      nameRequired: tSchema("nameRequired"),
      nameTooLong: tSchema("nameTooLong"),
      targetAmountRequired: tSchema("targetAmountRequired"),
      targetAmountInvalid: tSchema("targetAmountInvalid"),
      targetAmountTooSmall: tSchema("targetAmountTooSmall"),
      targetAmountTooLarge: tSchema("targetAmountTooLarge"),
      amountSavedInvalid: tSchema("amountSavedInvalid"),
      amountSavedNegative: tSchema("amountSavedNegative"),
      amountSavedTooLarge: tSchema("amountSavedTooLarge"),
      amountSavedExceedsTarget: tSchema("amountSavedExceedsTarget"),
      targetDateRequired: tSchema("targetDateRequired"),
      targetDateInvalid: tSchema("targetDateInvalid"),
      targetDateInPast: tSchema("targetDateInPast"),
      targetDateTooFar: tSchema("targetDateTooFar"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  const [values, setValues] = useState<CreateSavingsGoalFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setFullYear(d.getFullYear() + 40);
    return d.toISOString().slice(0, 10);
  }, []);

  const parsedTarget = parseMoneyInput(values.targetAmount, {
    allowNegative: false,
    maxDecimals: 2,
  });
  const parsedSaved =
    values.amountSaved.trim() === ""
      ? null
      : parseMoneyInput(values.amountSaved, {
          allowNegative: false,
          maxDecimals: 2,
        });
  const suggestedMonthly =
    parsedTarget != null
      ? suggestMonthlyContribution(parsedTarget, parsedSaved, values.targetDate)
      : null;
  const suggestedMonthlyDisplay =
    suggestedMonthly != null
      ? formatMoneyV2(suggestedMonthly, currency, locale, {
          fractionDigits: moneyDecimalsFor(suggestedMonthly),
        })
      : null;
  const isMonthlyHigh =
    suggestedMonthly != null && suggestedMonthly >= MONTHLY_HIGH_THRESHOLD;

  const update = (key: keyof CreateSavingsGoalFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    if (isSubmitting) return;

    const schema = buildCreateSavingsGoalFormSchema(schemaMessages);
    const result = schema.safeParse(values);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CreateSavingsGoalFormValues | undefined;
        if (key && !next[key]) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    const parsed = parseCreateSavingsGoalFormValues(result.data);
    const monthly =
      suggestMonthlyContribution(
        parsed.targetAmount,
        parsed.amountSaved,
        parsed.targetDate,
      ) ?? 0;

    setErrors({});
    await onSubmit({
      name: parsed.name,
      targetAmount: parsed.targetAmount,
      targetDate: parsed.targetDate,
      amountSaved: parsed.amountSaved,
      monthlyContribution: monthly,
    });
  };

  return (
    <form
      data-testid="savings-goal-draft-card"
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        "rounded-[1.75rem] border border-eb-stroke/40 bg-eb-surface",
        "px-4 py-5 sm:px-6 sm:py-6",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[16px] font-bold tracking-[-0.01em] text-eb-text sm:text-[17px]">
          {t("draftHeading")}
        </h3>
        <p className="text-[12px] text-eb-text/55">{t("draftScopeNote")}</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <FormField
            label={t("draftNameLabel")}
            htmlFor="savings-draft-name"
            error={errors.name}
          >
            <TextInput
              id="savings-draft-name"
              ref={nameInputRef}
              type="text"
              autoComplete="off"
              placeholder={t("draftNamePlaceholder")}
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              maxLength={255}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label={t("draftMonthlyEstimateLabel")}
            htmlFor="savings-draft-monthly"
            hint={
              suggestedMonthlyDisplay
                ? isMonthlyHigh
                  ? t("draftMonthlyEstimateHighHint")
                  : t("draftMonthlyEstimateHint")
                : t("draftMonthlyEstimateUnavailable")
            }
          >
            <div
              id="savings-draft-monthly"
              data-testid="savings-draft-monthly"
              aria-live="polite"
              className={cn(
                "flex h-11 items-center justify-end rounded-2xl px-4",
                "border border-eb-stroke/30 bg-eb-surface/85 backdrop-blur",
                "text-right text-[18px] font-bold tabular-nums tracking-[-0.01em]",
                suggestedMonthlyDisplay ? "text-eb-text" : "text-eb-text/40",
              )}
            >
              {suggestedMonthlyDisplay ?? "—"}
            </div>
          </FormField>
        </div>

        <div className="space-y-4">
          <FormField
            label={t("draftTargetAmountLabel")}
            htmlFor="savings-draft-target-amount"
            error={errors.targetAmount}
          >
            <MoneyInput
              id="savings-draft-target-amount"
              value={values.targetAmount}
              onChange={(event) => update("targetAmount", event.target.value)}
              placeholder="0"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label={t("draftAmountSavedLabel")}
            htmlFor="savings-draft-amount-saved"
            error={errors.amountSaved}
            hint={errors.amountSaved ? undefined : t("draftAmountSavedHint")}
          >
            <MoneyInput
              id="savings-draft-amount-saved"
              value={values.amountSaved}
              onChange={(event) => update("amountSaved", event.target.value)}
              placeholder="0"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label={t("draftTargetDateLabel")}
            htmlFor="savings-draft-target-date"
            error={errors.targetDate}
          >
            <TextInput
              id="savings-draft-target-date"
              type="date"
              min={today}
              max={maxDate}
              value={values.targetDate}
              onChange={(event) => update("targetDate", event.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          data-testid="savings-draft-error"
          className="mt-4 rounded-2xl border border-eb-danger/40 bg-eb-danger/5 px-4 py-2.5 text-sm text-eb-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn(
            "h-10 rounded-full px-4 text-[13px] font-semibold",
            "border border-eb-stroke/60 bg-eb-surface text-eb-text/75",
            "hover:bg-white transition",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {t("draftCancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="savings-draft-submit"
          className={cn(
            "h-10 rounded-full px-5 text-[13px] font-semibold",
            "bg-eb-accent text-white shadow-[0_8px_20px_rgba(21,39,81,0.12)]",
            "hover:brightness-105 transition",
            "disabled:cursor-not-allowed disabled:opacity-70",
          )}
        >
          {isSubmitting ? t("draftSubmitting") : t("draftSubmit")}
        </button>
      </div>
    </form>
  );
}
