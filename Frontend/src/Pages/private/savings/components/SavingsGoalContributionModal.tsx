import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import {
  buildPatchSavingsGoalAdjustFormSchema,
  parsePatchSavingsGoalAdjust,
  type PatchSavingsGoalAdjustMessages,
} from "@/schemas/dashboard/monthEditor/savingsGoal.schemas";
import type {
  BudgetMonthSavingsGoalEditorRowDto,
  SavingsGoalEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import { savingsGoalModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type SavingsGoalContributionModalProps = {
  open: boolean;
  row: BudgetMonthSavingsGoalEditorRowDto | null;
  monthLabel: string;
  /**
   * Trustworthy month-level remaining-to-spend value (from the dashboard
   * aggregate). When omitted, the soft warning is suppressed rather than
   * computed from incomplete data.
   */
  remainingBudgetRoom?: number | null;
  isSaving?: boolean;
  onClose: () => void;
  /**
   * Receives the parsed values. `targetDate` is only present when the chosen
   * scope honors plan-level writes (`currentMonthAndBudgetPlan`) so a single
   * Save call never has to second-guess scope semantics.
   */
  onSubmit: (values: {
    monthlyContribution: number;
    targetDate?: string;
    scope: SavingsGoalEditScope;
  }) => Promise<void>;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

type FieldErrors = {
  monthlyContribution?: string;
  targetDate?: string;
};

/**
 * Serialise a stored decimal to an input-friendly string without losing
 * precision. Avoids `String(1500)` returning `"1500"` and `String(0.1+0.2)`
 * surprises by trimming to at most two decimals.
 */
function formatNumberForInput(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

/** Stored `targetDate` arrives as an ISO datetime string; trim to yyyy-MM-dd. */
function formatDateForInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}

/**
 * Format yyyy-MM-dd as a human-readable date in the active locale. Returns an
 * empty string when the value is not a parseable ISO date so we never show a
 * misleading caption (e.g. "Invalid Date"). The native <input type="date">
 * may render MM/DD/YYYY on US-locale browsers, so this caption acts as the
 * unambiguous source of truth for what the user has picked.
 */
function formatIsoDateForDisplay(value: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

const DATE_EDIT_SCOPE: SavingsGoalEditScope = "currentMonthAndBudgetPlan";

export default function SavingsGoalContributionModal({
  open,
  row,
  monthLabel,
  remainingBudgetRoom,
  isSaving = false,
  onClose,
  onSubmit,
}: SavingsGoalContributionModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsGoalModalDict.sv>(key: K) =>
    tDict(key, locale, savingsGoalModalDict);

  const [amountMonthly, setAmountMonthly] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [scope, setScope] = useState<SavingsGoalEditScope>("currentMonthOnly");
  const [errors, setErrors] = useState<FieldErrors>({});

  const canUpdatePlan = row?.canUpdateDefault ?? false;
  const dateEditingEnabled = scope === DATE_EDIT_SCOPE;

  const schemaMessages = useMemo<PatchSavingsGoalAdjustMessages>(
    () => ({
      monthlyRequired: t("amountRequired"),
      monthlyInvalid: t("amountInvalid"),
      monthlyNegative: t("amountNegative"),
      monthlyTooLarge: t("amountTooLarge"),
      targetDateRequired: t("targetDateRequired"),
      targetDateInvalid: t("targetDateInvalid"),
      targetDateInPast: t("targetDateInPast"),
      targetDateTooFar: t("targetDateTooFar"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  const originalDate = formatDateForInput(row?.targetDate ?? null);
  const originalAmount = row?.monthlyContribution ?? 0;

  useEffect(() => {
    if (!open) return;
    if (!row) return;

    setAmountMonthly(formatNumberForInput(row.monthlyContribution));
    setTargetDate(formatDateForInput(row.targetDate));
    setScope("currentMonthOnly");
    setErrors({});
  }, [open, row]);

  // The date is plan-level. When the user leaves the only scope that honors
  // plan writes, snap the displayed date back to the stored value so the
  // disabled field cannot show a draft we would never persist.
  useEffect(() => {
    if (!open) return;
    if (dateEditingEnabled) return;
    setTargetDate(originalDate);
    if (errors.targetDate) {
      setErrors((prev) => ({ ...prev, targetDate: undefined }));
    }
  }, [dateEditingEnabled, open, originalDate, errors.targetDate]);

  const parsedAmount = useMemo(
    () =>
      parseMoneyInput(amountMonthly, {
        allowNegative: false,
        maxDecimals: 2,
      }),
    [amountMonthly],
  );

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

  const targetDateCaption = useMemo(
    () => formatIsoDateForDisplay(targetDate, locale),
    [targetDate, locale],
  );

  const isDirty = useMemo(() => {
    if (!row) return false;
    if (scope !== "currentMonthOnly") return true;
    if (parsedAmount !== row.monthlyContribution) return true;
    if (targetDate !== originalDate) return true;
    return false;
  }, [parsedAmount, scope, row, targetDate, originalDate]);

  const canClose = !isSaving;
  const canSoftClose = canClose && !isDirty;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!canSoftClose) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, canSoftClose, onClose]);

  const budgetWarning = useMemo(() => {
    if (parsedAmount === null) return null;
    if (typeof remainingBudgetRoom !== "number") return null;
    if (!Number.isFinite(remainingBudgetRoom)) return null;
    const delta = parsedAmount - originalAmount;
    if (delta <= 0) return null;
    if (delta <= remainingBudgetRoom) return null;
    const over = delta - remainingBudgetRoom;
    return {
      over,
      message: interpolate(t("budgetImpactExceeds"), {
        amount: formatMoneyV2(over, currency, locale, {
          fractionDigits: moneyDecimalsFor(over),
        }),
      }),
    };
  }, [parsedAmount, originalAmount, remainingBudgetRoom, t, currency, locale]);

  if (!open || !row) return null;

  const updateAmount = (value: string) => {
    setAmountMonthly(value);
    if (errors.monthlyContribution) {
      setErrors((prev) => ({ ...prev, monthlyContribution: undefined }));
    }
  };

  const updateTargetDate = (value: string) => {
    // Native <input type="date"> emits yyyy-MM-dd regardless of the display
    // locale, so we trust the value as-is. The localized caption below the
    // field handles any display ambiguity.
    setTargetDate(value);
    if (errors.targetDate) {
      setErrors((prev) => ({ ...prev, targetDate: undefined }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const schema = buildPatchSavingsGoalAdjustFormSchema(schemaMessages, {
      enforceTargetDate: dateEditingEnabled,
    });
    const result = schema.safeParse({
      monthlyContribution: amountMonthly,
      targetDate,
    });
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === "monthlyContribution" && !next.monthlyContribution) {
          next.monthlyContribution = issue.message;
        }
        if (key === "targetDate" && !next.targetDate) {
          next.targetDate = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    const parsed = parsePatchSavingsGoalAdjust(result.data, {
      enforceTargetDate: dateEditingEnabled,
    });
    // Only forward `targetDate` to the page when the scope honors plan-level
    // writes AND the user actually changed it. This is the FE half of the
    // "date is plan-level" contract; the BE applier also ignores `targetDate`
    // outside that scope, so a stale client cannot drift goal state.
    const dateChanged = dateEditingEnabled && parsed.targetDate !== undefined
      && parsed.targetDate !== originalDate;
    await onSubmit({
      monthlyContribution: parsed.monthlyContribution,
      targetDate: dateChanged ? parsed.targetDate : undefined,
      scope,
    });
  };

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        onClick={canSoftClose ? onClose : undefined}
        disabled={!canSoftClose}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[680px]">
          <BudgetEntryModalShell
            titleId="savings-goal-modal-title"
            descriptionId="savings-goal-modal-description"
            eyebrow={t("eyebrow")}
            title={t("titleEdit")}
            context={`${row.name} · ${monthLabel}`}
            description={t("description")}
            closeAriaLabel={t("closeAriaLabel")}
            canClose={canClose}
            onClose={onClose}
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!canClose}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("cancel")}
                </button>
                <CtaButton
                  type="submit"
                  form="savings-goal-form"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className="h-11"
                >
                  {isSaving ? t("saving") : t("saveChanges")}
                </CtaButton>
              </div>
            }
          >
            <form
              id="savings-goal-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                <FormField
                  label={t("amountLabel")}
                  htmlFor="savings-amount"
                  error={errors.monthlyContribution}
                >
                  <MoneyInput
                    id="savings-amount"
                    value={amountMonthly}
                    onChange={(event) => updateAmount(event.target.value)}
                    disabled={isSaving}
                  />
                </FormField>

                <FormField
                  label={t("targetDateLabel")}
                  htmlFor="savings-target-date"
                  error={errors.targetDate}
                  hint={
                    errors.targetDate
                      ? undefined
                      : dateEditingEnabled
                        ? t("targetDateHelperEnabled")
                        : t("targetDateHelperDisabled")
                  }
                >
                  <TextInput
                    id="savings-target-date"
                    type="date"
                    min={today}
                    max={maxDate}
                    value={targetDate}
                    onChange={(event) => updateTargetDate(event.target.value)}
                    disabled={isSaving || !dateEditingEnabled}
                    aria-disabled={!dateEditingEnabled || undefined}
                  />
                  {targetDateCaption ? (
                    <div
                      data-testid="savings-goal-modal-target-date-caption"
                      className="mt-1 text-[11px] font-medium leading-tight text-eb-text/55"
                    >
                      <span className="uppercase tracking-[0.12em] text-eb-text/45">
                        {t("targetDateCaptionLabel")}
                      </span>
                      <span className="ml-1.5 text-eb-text/70">
                        {targetDateCaption}
                      </span>
                    </div>
                  ) : null}
                </FormField>
              </div>

              {budgetWarning ? (
                <div
                  role="status"
                  data-testid="savings-goal-budget-warning"
                  className="rounded-2xl border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900"
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800/80">
                    {t("budgetImpactLabel")}
                  </span>
                  <span className="mt-1 block">{budgetWarning.message}</span>
                </div>
              ) : null}

              <EditScopeRadioCards
                value={scope}
                onChange={setScope}
                monthLabel={monthLabel}
                canUpdatePlan={canUpdatePlan}
                disabledPlanHint={t("scopePlanDisabledHint")}
                disabled={isSaving}
                testId="savings-goal-modal-scope-toggle"
              />
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}
