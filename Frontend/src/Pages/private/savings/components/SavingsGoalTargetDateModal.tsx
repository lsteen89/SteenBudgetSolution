import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import {
  buildPatchSavingsGoalAdjustFormSchema,
  type PatchSavingsGoalAdjustMessages,
} from "@/schemas/dashboard/monthEditor/savingsGoal.schemas";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsGoalTargetDateModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalTargetDateModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useEffect, useMemo, useState, type FormEvent } from "react";

export type SavingsGoalTargetDateMode = "recalcMonthly" | "keepMonthly";

type SavingsGoalTargetDateModalProps = {
  open: boolean;
  row: BudgetMonthSavingsGoalEditorRowDto | null;
  monthLabel: string;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    monthlyContribution: number;
    targetDate: string;
    mode: SavingsGoalTargetDateMode;
  }) => Promise<void>;
};

type FieldErrors = {
  targetDate?: string;
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

function formatMonthForInput(value: string | null | undefined): string {
  const date = formatDateForInput(value);
  return date ? date.slice(0, 7) : "";
}

function monthToIsoDate(value: string): string {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : "";
}

function formatIsoDateForDisplay(value: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(date);
}

function monthsToTarget(targetDate: string, now: Date = new Date()): number {
  const target = new Date(`${targetDate}T00:00:00`);
  const current = new Date(now);
  current.setDate(1);
  current.setHours(0, 0, 0, 0);
  return Math.max(
    1,
    (target.getFullYear() - current.getFullYear()) * 12 +
      (target.getMonth() - current.getMonth()),
  );
}

function defaultFutureMonth(): string {
  return addMonthsToToday(6);
}

/**
 * Build a `yyyy-MM` value `monthsAhead` months past the first of the current
 * month. Operating off the 1st avoids the classic month-arithmetic landmine
 * where Jan 31 + 1 month rolls into March, and keeps the picker constrained
 * to legal future months by construction.
 */
function addMonthsToToday(monthsAhead: number): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + monthsAhead);
  return formatYearMonth(d);
}

function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function splitYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Localized full month names ("January", "februari", "veebruar", …). Built
 * off a fixed date in each month so DST / locale-zero-padding quirks can't
 * shift the index.
 */
function localizedMonthNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, monthIndex) =>
    fmt.format(new Date(2000, monthIndex, 15)),
  );
}

const YEAR_RANGE_AHEAD = 40;
const QUICK_OFFSETS = [3, 6, 12, 24] as const;
type QuickOffset = (typeof QUICK_OFFSETS)[number];

export default function SavingsGoalTargetDateModal({
  open,
  row,
  monthLabel,
  isSaving = false,
  onClose,
  onSubmit,
}: SavingsGoalTargetDateModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsGoalTargetDateModalDict.sv>(
    key: K,
  ) => tDict(key, locale, savingsGoalTargetDateModalDict);

  const [targetMonth, setTargetMonth] = useState("");
  const [mode, setMode] = useState<SavingsGoalTargetDateMode>("recalcMonthly");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open || !row) return;
    setTargetMonth(formatMonthForInput(row.targetDate) || defaultFutureMonth());
    setMode("recalcMonthly");
    setErrors({});
  }, [open, row]);

  // NOTE: these two memos must live above the `!open || !row` early-return
  // below so React sees the same hook count on every render of the component.
  const monthNames = useMemo(() => localizedMonthNames(locale), [locale]);
  const yearOptions = useMemo(
    () =>
      Array.from(
        { length: YEAR_RANGE_AHEAD + 1 },
        (_, i) => new Date().getFullYear() + i,
      ),
    [],
  );

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

  if (!open || !row) return null;

  const canUpdatePlan = row.canUpdateDefault;
  const targetDate = monthToIsoDate(targetMonth);
  const remaining =
    row.targetAmount == null
      ? 0
      : Math.max(0, row.targetAmount - (row.amountSaved ?? 0));
  const months = targetDate ? monthsToTarget(targetDate) : 1;
  const recomputedMonthly = Math.ceil(remaining / months);
  const submittedMonthly =
    mode === "recalcMonthly" ? recomputedMonthly : row.monthlyContribution;

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
  const selectedDateCaption = formatIsoDateForDisplay(targetDate, locale);
  const outcomeText = buildOutcomeText({
    mode,
    row,
    targetDate,
    months,
    recomputedMonthly,
    locale,
    fmtMoney,
    t,
  });

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth(); // 0..11
  const maxYear = currentYear + YEAR_RANGE_AHEAD;

  const updateTargetMonth = (value: string) => {
    setTargetMonth(value);
    if (errors.targetDate) {
      setErrors((prev) => ({ ...prev, targetDate: undefined }));
    }
  };

  const selectedParts = splitYearMonth(targetMonth);
  const selectedYear = selectedParts?.year ?? currentYear;
  const selectedMonth1 = selectedParts?.month ?? currentMonthIndex + 1; // 1..12

  /**
   * The validator treats "this month" as already in the past (`targetDateInPast`
   * fires on `yyyy-MM-01 <= today`), so the first legal future month is
   * `currentMonthIndex + 1`. We mirror that rule in BOTH select handlers and in
   * the month-disabled predicate so the user simply cannot land on an illegal
   * month from the UI — the validator becomes a belt-and-braces guard for
   * stale / programmatic state, not the primary safety net.
   */
  const handleYearChange = (nextYear: number) => {
    let nextMonth1 = selectedMonth1;
    if (nextYear === currentYear && nextMonth1 <= currentMonthIndex + 1) {
      nextMonth1 = currentMonthIndex + 2; // first legal future month (1-based)
      if (nextMonth1 > 12) {
        // we are in December — slide to January of next year
        updateTargetMonth(`${nextYear + 1}-01`);
        return;
      }
    }
    if (nextYear > maxYear) return;
    updateTargetMonth(
      `${nextYear}-${String(nextMonth1).padStart(2, "0")}`,
    );
  };

  const handleMonthChange = (nextMonth1: number) => {
    updateTargetMonth(
      `${selectedYear}-${String(nextMonth1).padStart(2, "0")}`,
    );
  };

  const handleQuickPick = (offset: QuickOffset) => {
    updateTargetMonth(addMonthsToToday(offset));
  };

  const isMonthDisabled = (monthIndex0: number): boolean =>
    selectedYear === currentYear && monthIndex0 <= currentMonthIndex;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUpdatePlan) return;

    const schema = buildPatchSavingsGoalAdjustFormSchema(schemaMessages, {
      enforceTargetDate: true,
    });
    const result = schema.safeParse({
      monthlyContribution: formatNumberForInput(submittedMonthly),
      targetDate,
    });
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "targetDate" && !next.targetDate) {
          next.targetDate = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    await onSubmit({
      monthlyContribution: submittedMonthly,
      targetDate,
      mode,
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
            titleId="savings-goal-target-date-modal-title"
            descriptionId="savings-goal-target-date-modal-description"
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
                    form="savings-goal-target-date-form"
                    disabled={isSaving || !canUpdatePlan}
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
              id="savings-goal-target-date-form"
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

              {!canUpdatePlan ? (
                <div
                  role="status"
                  className="rounded-2xl border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900"
                >
                  {t("orphanHint")}
                </div>
              ) : null}

              <FormField
                label={t("targetDateLabel")}
                htmlFor="savings-goal-target-month-month"
                error={errors.targetDate}
                hint={
                  errors.targetDate
                    ? undefined
                    : selectedDateCaption
                      ? `${t("targetDateCaptionLabel")}: ${selectedDateCaption}`
                      : undefined
                }
              >
                <MonthYearPicker
                  monthNames={monthNames}
                  yearOptions={yearOptions}
                  selectedYear={selectedYear}
                  selectedMonth1={selectedMonth1}
                  disabled={isSaving || !canUpdatePlan}
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                  isMonthDisabled={isMonthDisabled}
                  labels={{
                    year: t("yearSelectLabel"),
                    month: t("monthSelectLabel"),
                  }}
                />
                <QuickPickRow
                  disabled={isSaving || !canUpdatePlan}
                  legend={t("quickPickLegend")}
                  selectedYearMonth={targetMonth}
                  labelFor={(offset) =>
                    interpolate(
                      offset >= 12 ? t("quickPickYears") : t("quickPickMonths"),
                      {
                        value: offset >= 12 ? offset / 12 : offset,
                      },
                    )
                  }
                  onPick={handleQuickPick}
                />
              </FormField>

              {canUpdatePlan ? (
                <ModeStrip
                  mode={mode}
                  disabled={isSaving}
                  labels={{
                    legend: t("modeLegend"),
                    recalc: t("recalcMonthly"),
                    recalcHelp: t("recalcMonthlyHelp"),
                    keep: t("keepMonthly"),
                    keepHelp: t("keepMonthlyHelp"),
                  }}
                  onChange={setMode}
                />
              ) : (
                <EditScopeRadioCards
                  value="currentMonthOnly"
                  onChange={() => undefined}
                  monthLabel={monthLabel}
                  canUpdatePlan={false}
                  disabledPlanHint={t("scopePlanDisabledHint")}
                  disabled={isSaving}
                  testId="savings-goal-target-date-scope-toggle"
                />
              )}

              <div
                role="status"
                aria-live="polite"
                data-testid="savings-goal-target-date-outcome"
                className="rounded-2xl border border-eb-accent/20 bg-eb-accentSoft px-4 py-3 text-[13px] leading-relaxed text-[#14532d]"
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#14532d]/70">
                  {t("outcomeLabel")}
                </span>
                <span className="mt-1 block font-semibold">{outcomeText}</span>
              </div>
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}

function buildOutcomeText({
  mode,
  row,
  targetDate,
  months,
  recomputedMonthly,
  locale,
  fmtMoney,
  t,
}: {
  mode: SavingsGoalTargetDateMode;
  row: BudgetMonthSavingsGoalEditorRowDto;
  targetDate: string;
  months: number;
  recomputedMonthly: number;
  locale: string;
  fmtMoney: (value: number) => string;
  t: <K extends keyof typeof savingsGoalTargetDateModalDict.sv>(
    key: K,
  ) => string;
}) {
  const date = formatIsoDateForDisplay(targetDate, locale) || t("outcomePickDate");
  if (!targetDate) return t("outcomePickDate");

  if (mode === "recalcMonthly") {
    const delta = recomputedMonthly - row.monthlyContribution;
    if (delta === 0) {
      return interpolate(t("outcomeRecalcSame"), {
        date,
        amount: fmtMoney(recomputedMonthly),
      });
    }
    return interpolate(t("outcomeRecalc"), {
      date,
      amount: fmtMoney(recomputedMonthly),
      delta: `${delta > 0 ? "+" : ""}${fmtMoney(delta)}`,
    });
  }

  const remaining =
    row.targetAmount == null
      ? 0
      : Math.max(0, row.targetAmount - (row.amountSaved ?? 0));
  const possible = row.monthlyContribution * months;
  if (possible >= remaining) {
    return interpolate(t("outcomeKeepReach"), {
      amount: fmtMoney(row.monthlyContribution),
      date,
    });
  }
  return interpolate(t("outcomeKeepShort"), {
    amount: fmtMoney(row.monthlyContribution),
    saved: fmtMoney(possible + (row.amountSaved ?? 0)),
    date,
  });
}

function ModeStrip({
  mode,
  disabled,
  labels,
  onChange,
}: {
  mode: SavingsGoalTargetDateMode;
  disabled: boolean;
  labels: {
    legend: string;
    recalc: string;
    recalcHelp: string;
    keep: string;
    keepHelp: string;
  };
  onChange: (mode: SavingsGoalTargetDateMode) => void;
}) {
  return (
    <div className="space-y-2" data-testid="savings-goal-target-date-mode-toggle">
      <div className="text-[11px] font-bold uppercase tracking-wide text-eb-text/55">
        {labels.legend}
      </div>
      <div role="radiogroup" aria-label={labels.legend} className="grid gap-1.5">
        <ModeCard
          selected={mode === "recalcMonthly"}
          disabled={disabled}
          label={labels.recalc}
          help={labels.recalcHelp}
          onSelect={() => onChange("recalcMonthly")}
        />
        <ModeCard
          selected={mode === "keepMonthly"}
          disabled={disabled}
          label={labels.keep}
          help={labels.keepHelp}
          onSelect={() => onChange("keepMonthly")}
        />
      </div>
    </div>
  );
}

function ModeCard({
  selected,
  disabled,
  label,
  help,
  onSelect,
}: {
  selected: boolean;
  disabled: boolean;
  label: string;
  help: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-[54px] items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-[rgb(var(--eb-accent)/0.42)] bg-white text-eb-text shadow-[0_10px_24px_rgba(21,39,81,0.07)]"
          : "border-eb-stroke/24 bg-[rgb(var(--eb-shell)/0.30)] text-eb-text/68 hover:bg-white/72",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-[rgb(var(--eb-accent))] bg-[rgb(var(--eb-accent))]"
            : "border-eb-stroke/45 bg-white/60",
        )}
        aria-hidden="true"
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold leading-tight">
          {label}
        </span>
        <span className="mt-0.5 block text-xs font-medium leading-snug text-eb-text/58">
          {help}
        </span>
      </span>
    </button>
  );
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

function MonthYearPicker({
  monthNames,
  yearOptions,
  selectedYear,
  selectedMonth1,
  disabled,
  onYearChange,
  onMonthChange,
  isMonthDisabled,
  labels,
}: {
  monthNames: string[];
  yearOptions: number[];
  selectedYear: number;
  selectedMonth1: number;
  disabled: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month1: number) => void;
  isMonthDisabled: (monthIndex0: number) => boolean;
  labels: { year: string; month: string };
}) {
  const selectClasses = cn(
    "h-11 w-full rounded-2xl border bg-white px-3 text-sm font-semibold text-eb-text",
    "border-eb-stroke/40 focus:border-eb-accent/60 focus:outline-none focus:ring-4 focus:ring-eb-accent/15",
    "disabled:cursor-not-allowed disabled:bg-[rgb(var(--eb-shell)/0.22)] disabled:text-eb-text/45",
  );

  return (
    <div
      className="grid grid-cols-[1fr_minmax(0,7rem)] gap-2"
      data-testid="savings-goal-target-month"
    >
      <label className="sr-only" htmlFor="savings-goal-target-month-month">
        {labels.month}
      </label>
      <select
        id="savings-goal-target-month-month"
        data-testid="savings-goal-target-month-month"
        aria-label={labels.month}
        value={selectedMonth1}
        disabled={disabled}
        onChange={(event) => onMonthChange(Number(event.target.value))}
        className={selectClasses}
      >
        {monthNames.map((name, index) => (
          <option
            key={index}
            value={index + 1}
            disabled={isMonthDisabled(index)}
          >
            {name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="savings-goal-target-month-year">
        {labels.year}
      </label>
      <select
        id="savings-goal-target-month-year"
        data-testid="savings-goal-target-month-year"
        aria-label={labels.year}
        value={selectedYear}
        disabled={disabled}
        onChange={(event) => onYearChange(Number(event.target.value))}
        className={cn(selectClasses, "tabular-nums")}
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

function QuickPickRow({
  disabled,
  legend,
  selectedYearMonth,
  labelFor,
  onPick,
}: {
  disabled: boolean;
  legend: string;
  selectedYearMonth: string;
  labelFor: (offset: QuickOffset) => string;
  onPick: (offset: QuickOffset) => void;
}) {
  // Compute, once per render, which chip matches the current selection so the
  // user gets visual feedback (and so screen readers can announce "Pressed").
  // We rebuild the expected yyyy-MM for each offset rather than reverse-deriving
  // months-from-now from the input, which keeps DST / clock-skew out of the
  // comparison.
  const expectedByOffset = new Map<QuickOffset, string>(
    QUICK_OFFSETS.map((offset) => [offset, addMonthsToToday(offset)]),
  );

  return (
    <div className="mt-2.5">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-eb-text/50">
        {legend}
      </div>
      <div
        role="group"
        aria-label={legend}
        data-testid="savings-goal-target-month-quick"
        className="flex flex-wrap gap-1.5"
      >
        {QUICK_OFFSETS.map((offset) => {
          const isActive = expectedByOffset.get(offset) === selectedYearMonth;
          return (
            <button
              key={offset}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => onPick(offset)}
              data-testid={`savings-goal-target-month-quick-${offset}`}
              className={cn(
                "h-8 rounded-full border px-3 text-[12px] font-semibold transition",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "border-[rgb(var(--eb-accent)/0.55)] bg-eb-accentSoft text-[#14532d]"
                  : "border-eb-stroke/40 bg-white/85 text-eb-text/70 hover:bg-white",
              )}
            >
              {labelFor(offset)}
            </button>
          );
        })}
      </div>
    </div>
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
