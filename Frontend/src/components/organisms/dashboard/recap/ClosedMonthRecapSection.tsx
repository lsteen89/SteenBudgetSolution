import DashboardErrorState from "@/components/organisms/dashboard/DashboardErrorState";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

type ClosedMonthRecapSectionProps = {
  recap: BudgetMonthRecapDto | null | undefined;
  currency: CurrencyCode;
  locale: string;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  previousPeriodLabel?: string | null;
  nextPeriodLabel?: string | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onGoPrevious?: () => void;
  onGoNext?: () => void;
  isSwitchingMonth?: boolean;
};

const totalLabels = [
  ["totalIncomeMonthly", "Income"],
  ["totalExpensesMonthly", "Expenses"],
  ["totalSavingsMonthly", "Savings"],
  ["totalDebtPaymentsMonthly", "Debt payments"],
  ["finalBalanceMonthly", "Final balance"],
] as const;

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatYearMonth(value: string, locale: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, 1);

  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function carryOverLabel(recap: BudgetMonthRecapDto, currency: CurrencyCode, locale: string) {
  if (recap.month.carryOverMode === "none" || recap.month.carryOverAmount == null) {
    return "No carry-over received";
  }

  return formatMoneyV2(recap.month.carryOverAmount, currency, locale, {
    fractionDigits: 0,
  });
}

function RecapNav({
  previousPeriodLabel,
  nextPeriodLabel,
  canGoPrevious,
  canGoNext,
  onGoPrevious,
  onGoNext,
  isSwitchingMonth,
}: Pick<
  ClosedMonthRecapSectionProps,
  | "previousPeriodLabel"
  | "nextPeriodLabel"
  | "canGoPrevious"
  | "canGoNext"
  | "onGoPrevious"
  | "onGoNext"
  | "isSwitchingMonth"
>) {
  const buttonClass =
    "inline-flex h-10 items-center gap-2 rounded-full border border-eb-stroke/40 bg-eb-surface/85 px-3 text-sm font-semibold text-eb-text shadow-sm transition hover:bg-eb-surface disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        data-testid="month-nav-previous"
        className={buttonClass}
        disabled={!canGoPrevious || isSwitchingMonth}
        onClick={onGoPrevious}
      >
        <ChevronLeft className="h-4 w-4" />
        <span>{previousPeriodLabel ?? "Previous"}</span>
      </button>

      <button
        type="button"
        data-testid="month-nav-next"
        className={buttonClass}
        disabled={!canGoNext || isSwitchingMonth}
        onClick={onGoNext}
      >
        <span>{nextPeriodLabel ?? "Next"}</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ClosedMonthRecapSection({
  recap,
  currency,
  locale,
  isLoading,
  errorMessage,
  onRetry,
  previousPeriodLabel,
  nextPeriodLabel,
  canGoPrevious,
  canGoNext,
  onGoPrevious,
  onGoNext,
  isSwitchingMonth = false,
}: ClosedMonthRecapSectionProps) {
  if (isLoading) {
    return (
      <section
        data-testid="closed-month-recap"
        className="w-full max-w-6xl space-y-4 rounded-2xl border border-eb-stroke/30 bg-eb-surface/90 p-5 shadow-sm"
      >
        <RecapNav
          previousPeriodLabel={previousPeriodLabel}
          nextPeriodLabel={nextPeriodLabel}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onGoPrevious={onGoPrevious}
          onGoNext={onGoNext}
          isSwitchingMonth={isSwitchingMonth}
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-eb-text/70">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading closed month recap
        </div>
      </section>
    );
  }

  if (!recap) {
    return (
      <DashboardErrorState
        title="Could not load closed month recap"
        message={errorMessage ?? "Try again in a moment."}
        onRetry={onRetry}
      />
    );
  }

  const monthLabel = formatYearMonth(recap.month.yearMonth, locale);
  const previousComparable = recap.comparison.hasPreviousComparableMonth
    ? recap.comparison.previousComparableYearMonth
    : null;

  return (
    <section
      data-testid="closed-month-recap"
      className="w-full max-w-6xl space-y-5"
    >
      <RecapNav
        previousPeriodLabel={previousPeriodLabel}
        nextPeriodLabel={nextPeriodLabel}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onGoPrevious={onGoPrevious}
        onGoNext={onGoNext}
        isSwitchingMonth={isSwitchingMonth}
      />

      <div className="rounded-2xl border border-eb-stroke/30 bg-eb-surface/95 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="month-status-badge"
                className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200"
              >
                Closed
              </span>
              <span className="text-sm font-medium text-eb-text/60">
                Closed {formatDateTime(recap.month.closedAtUtc, locale)}
              </span>
            </div>

            <h1
              data-testid="active-month-label"
              className="text-2xl font-extrabold text-eb-text sm:text-3xl"
            >
              {monthLabel}
            </h1>
          </div>

          <div className="rounded-xl border border-eb-stroke/25 bg-white/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/50">
              Carry-over received
            </p>
            <p data-testid="closed-month-carry-over" className="mt-1 text-lg font-bold text-eb-text">
              {carryOverLabel(recap, currency, locale)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {totalLabels.map(([key, label]) => (
            <div
              key={key}
              data-testid={`closed-month-total-${key}`}
              className="rounded-xl border border-eb-stroke/25 bg-white/75 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/50">
                {label}
              </p>
              <p className="mt-2 text-xl font-extrabold text-eb-text">
                {formatMoneyV2(recap.snapshotTotals[key], currency, locale, {
                  fractionDigits: 0,
                })}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-eb-stroke/25 bg-eb-shell/35 px-4 py-3 text-sm font-medium text-eb-text/70">
          {previousComparable
            ? `Compared against ${formatYearMonth(previousComparable, locale)}.`
            : "No previous closed month is available for comparison yet."}
        </div>
      </div>
    </section>
  );
}
