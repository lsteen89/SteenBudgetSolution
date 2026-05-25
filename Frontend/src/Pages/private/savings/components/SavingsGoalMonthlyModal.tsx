import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
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
import { savingsGoalMonthlyModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalMonthlyModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type SavingsGoalMonthlyModalProps = {
  open: boolean;
  row: BudgetMonthSavingsGoalEditorRowDto | null;
  monthLabel: string;
  remainingBudgetRoom?: number | null;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    monthlyContribution: number;
    scope: SavingsGoalEditScope;
  }) => Promise<void>;
};

type FieldErrors = {
  monthlyContribution?: string;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

function formatNumberForInput(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatDateForInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}

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

export default function SavingsGoalMonthlyModal({
  open,
  row,
  monthLabel,
  remainingBudgetRoom,
  isSaving = false,
  onClose,
  onSubmit,
}: SavingsGoalMonthlyModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsGoalMonthlyModalDict.sv>(key: K) =>
    tDict(key, locale, savingsGoalMonthlyModalDict);

  const [amountMonthly, setAmountMonthly] = useState("");
  const [scope, setScope] = useState<SavingsGoalEditScope>("currentMonthOnly");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open || !row) return;
    setAmountMonthly(formatNumberForInput(row.monthlyContribution));
    setScope("currentMonthOnly");
    setErrors({});
  }, [open, row]);

  const schemaMessages = useMemo<PatchSavingsGoalAdjustMessages>(
    () => ({
      monthlyRequired: t("amountRequired"),
      monthlyInvalid: t("amountInvalid"),
      monthlyNegative: t("amountNegative"),
      monthlyTooLarge: t("amountTooLarge"),
      targetDateRequired: "",
      targetDateInvalid: "",
      targetDateInPast: "",
      targetDateTooFar: "",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  const parsedAmount = useMemo(
    () =>
      parseMoneyInput(amountMonthly, {
        allowNegative: false,
        maxDecimals: 2,
      }),
    [amountMonthly],
  );

  const budgetWarning = useMemo(() => {
    if (!row) return null;
    if (parsedAmount === null) return null;
    if (typeof remainingBudgetRoom !== "number") return null;
    if (!Number.isFinite(remainingBudgetRoom)) return null;
    const delta = parsedAmount - row.monthlyContribution;
    if (delta <= 0 || delta <= remainingBudgetRoom) return null;
    const over = delta - remainingBudgetRoom;
    return interpolate(t("budgetImpactExceeds"), {
      amount: formatMoneyV2(over, currency, locale, {
        fractionDigits: moneyDecimalsFor(over),
      }),
    });
  }, [row, parsedAmount, remainingBudgetRoom, t, currency, locale]);

  if (!open || !row) return null;

  const fmtMoney = (value: number) =>
    formatMoneyV2(value, currency, locale, {
      fractionDigits: moneyDecimalsFor(value),
    });

  const snapshotSaved = fmtMoney(row.amountSaved ?? 0);
  const snapshotTarget =
    row.targetAmount != null ? fmtMoney(row.targetAmount) : "—";
  const snapshotDeadline =
    formatIsoDateForDisplay(formatDateForInput(row.targetDate), locale) ||
    t("snapshotDeadlineOngoing");

  const outcomeText = buildOutcomeText({
    row,
    nextMonthly: parsedAmount,
    fmtMoney,
    t,
  });

  const updateAmount = (value: string) => {
    setAmountMonthly(value);
    if (errors.monthlyContribution) {
      setErrors((prev) => ({ ...prev, monthlyContribution: undefined }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const schema = buildPatchSavingsGoalAdjustFormSchema(schemaMessages, {
      enforceTargetDate: false,
    });
    const result = schema.safeParse({
      monthlyContribution: amountMonthly,
      targetDate: "",
    });
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "monthlyContribution" && !next.monthlyContribution) {
          next.monthlyContribution = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    const parsed = parsePatchSavingsGoalAdjust(result.data, {
      enforceTargetDate: false,
    });
    await onSubmit({
      monthlyContribution: parsed.monthlyContribution,
      scope,
    });
  };

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        onClick={isSaving ? undefined : onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[640px]">
          <BudgetEntryModalShell
            titleId="savings-goal-monthly-modal-title"
            descriptionId="savings-goal-monthly-modal-description"
            eyebrow={t("eyebrow")}
            title={t("title")}
            context={`${row.name} · ${monthLabel}`}
            description={t("description")}
            closeAriaLabel={t("closeAriaLabel")}
            canClose={!isSaving}
            onClose={onClose}
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-medium text-eb-text/45">
                  {t("footerNote")}
                </span>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("cancel")}
                  </button>
                  <CtaButton
                    type="submit"
                    form="savings-goal-monthly-form"
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="h-11"
                  >
                    {isSaving ? t("saving") : t("saveChanges")}
                  </CtaButton>
                </div>
              </div>
            }
          >
            <form
              id="savings-goal-monthly-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              <SnapshotDl
                saved={snapshotSaved}
                target={snapshotTarget}
                deadline={snapshotDeadline}
                labels={{
                  saved: t("snapshotSavedLabel"),
                  target: t("snapshotTargetLabel"),
                  deadline: t("snapshotDeadlineLabel"),
                }}
              />

              <FormField
                label={t("amountLabel")}
                htmlFor="savings-goal-monthly-amount"
                error={errors.monthlyContribution}
              >
                <MoneyInput
                  id="savings-goal-monthly-amount"
                  value={amountMonthly}
                  onChange={(event) => updateAmount(event.target.value)}
                  disabled={isSaving}
                  className="h-14 text-[22px]"
                />
              </FormField>

              <EditScopeRadioCards
                value={scope}
                onChange={setScope}
                monthLabel={monthLabel}
                canUpdatePlan={row.canUpdateDefault}
                disabledPlanHint={t("scopePlanDisabledHint")}
                disabled={isSaving}
                testId="savings-goal-monthly-scope-toggle"
              />

              <div
                role="status"
                aria-live="polite"
                data-testid="savings-goal-monthly-outcome"
                className="rounded-2xl border border-eb-accent/20 bg-eb-accentSoft px-4 py-3 text-[13px] leading-relaxed text-[#14532d]"
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#14532d]/70">
                  {t("outcomeLabel")}
                </span>
                <span className="mt-1 block font-semibold">{outcomeText}</span>
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
                  <span className="mt-1 block">{budgetWarning}</span>
                </div>
              ) : null}
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}

function buildOutcomeText({
  row,
  nextMonthly,
  fmtMoney,
  t,
}: {
  row: BudgetMonthSavingsGoalEditorRowDto;
  nextMonthly: number | null;
  fmtMoney: (value: number) => string;
  t: <K extends keyof typeof savingsGoalMonthlyModalDict.sv>(key: K) => string;
}) {
  if (nextMonthly === null) return t("outcomeOngoing");
  if (nextMonthly === 0) return t("outcomeStopped");
  if (nextMonthly === row.monthlyContribution) return t("outcomeUnchanged");
  if (row.targetAmount == null) return t("outcomeOngoing");

  const remaining = Math.max(0, row.targetAmount - (row.amountSaved ?? 0));
  const monthsNow =
    row.monthlyContribution > 0
      ? Math.ceil(remaining / row.monthlyContribution)
      : Number.POSITIVE_INFINITY;
  const monthsNext = Math.ceil(remaining / nextMonthly);
  const monthDelta = Number.isFinite(monthsNow) ? monthsNow - monthsNext : 0;
  const delta =
    monthDelta > 0
      ? interpolate(t("outcomeEarlier"), { months: monthDelta })
      : monthDelta < 0
        ? interpolate(t("outcomeLater"), { months: Math.abs(monthDelta) })
        : "";

  return interpolate(t("outcomeChanged"), {
    amount: fmtMoney(Math.abs(nextMonthly - row.monthlyContribution)),
    direction:
      nextMonthly > row.monthlyContribution
        ? t("outcomeIncrease")
        : t("outcomeDecrease"),
    months: monthsNext,
    delta,
  });
}

function SnapshotDl({
  saved,
  target,
  deadline,
  labels,
}: {
  saved: string;
  target: string;
  deadline: string;
  labels: { saved: string; target: string; deadline: string };
}) {
  return (
    <dl
      data-testid="savings-goal-modal-snapshot"
      className="grid grid-cols-3 gap-2.5"
    >
      <SnapshotCell label={labels.saved} value={saved} />
      <SnapshotCell label={labels.target} value={target} />
      <SnapshotCell label={labels.deadline} value={deadline} />
    </dl>
  );
}

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-eb-stroke/40 bg-[rgb(var(--eb-shell)/0.18)] px-3 py-2.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-eb-text/50">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] font-extrabold tabular-nums text-eb-text">
        {value}
      </dd>
    </div>
  );
}
