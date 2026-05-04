import DashboardErrorState from "@/components/organisms/dashboard/DashboardErrorState";
import {
  DebtDetailBlock,
  SavingsDetailBlock,
} from "@/components/organisms/dashboard/recap/ClosedMonthRecapDetailBlocks";
import { cn } from "@/lib/utils";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  ArrowRightLeft,
  BadgeCheck,
  CalendarCheck,
  ChartNoAxesColumn,
  CircleCheck,
  CircleMinus,
  CirclePause,
  CircleSlash,
  ChevronLeft,
  ChevronRight,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  PiggyBank,
  PlusCircle,
  ReceiptText,
  Repeat2,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type ClosedMonthRecapSectionProps = {
  recap: BudgetMonthRecapDto | null | undefined;
  currency: CurrencyCode;
  locale: AppLocale;
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

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;
type ComparisonMetricKey = keyof NonNullable<
  BudgetMonthRecapDto["comparison"]["summary"]
>;
type ComparisonTone = "positive" | "attention" | "neutral";
type ExpenseCategoryTone = ComparisonTone;
type SubscriptionGroupKey =
  | "active"
  | "new"
  | "removed"
  | "paused"
  | "cancelled";

const totalCards: Array<{
  key: keyof BudgetMonthRecapDto["snapshotTotals"];
  labelKey: RecapTKey;
  hintKey: RecapTKey;
  Icon: LucideIcon;
}> = [
  {
    key: "totalIncomeMonthly",
    labelKey: "income",
    hintKey: "incomeHint",
    Icon: WalletCards,
  },
  {
    key: "totalExpensesMonthly",
    labelKey: "expenses",
    hintKey: "expensesHint",
    Icon: ReceiptText,
  },
  {
    key: "totalSavingsMonthly",
    labelKey: "savings",
    hintKey: "savingsHint",
    Icon: PiggyBank,
  },
  {
    key: "totalDebtPaymentsMonthly",
    labelKey: "debtPayments",
    hintKey: "debtPaymentsHint",
    Icon: Landmark,
  },
  {
    key: "finalBalanceMonthly",
    labelKey: "finalBalance",
    hintKey: "finalBalanceHint",
    Icon: Scale,
  },
] as const;

const comparisonRows: Array<{
  key: ComparisonMetricKey;
  labelKey: RecapTKey;
  Icon: LucideIcon;
}> = [
  { key: "income", labelKey: "income", Icon: WalletCards },
  { key: "expenses", labelKey: "expenses", Icon: ReceiptText },
  { key: "savings", labelKey: "savings", Icon: PiggyBank },
  { key: "debtPayments", labelKey: "debtPayments", Icon: Landmark },
  { key: "finalBalance", labelKey: "finalBalance", Icon: Scale },
] as const;

function replaceToken(value: string, token: string, replacement: string) {
  return value.replace(`{${token}}`, replacement);
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

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

function formatSnapshotMoney(
  value: number,
  currency: CurrencyCode,
  locale: string,
) {
  return formatMoneyV2(value, currency, locale);
}

function formatSignedMoney(
  value: number,
  currency: CurrencyCode,
  locale: string,
) {
  if (value === 0) return formatSnapshotMoney(0, currency, locale);

  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatSnapshotMoney(Math.abs(value), currency, locale)}`;
}

function formatSignedPercent(value: number, locale: string) {
  if (value === 0) return "0%";

  const sign = value > 0 ? "+" : "-";
  const formatted = Math.abs(value).toLocaleString(locale, {
    maximumFractionDigits: 1,
  });

  return `${sign}${formatted}%`;
}

function comparisonTone(
  key: ComparisonMetricKey,
  deltaAmount: number,
): ComparisonTone {
  if (deltaAmount === 0) return "neutral";

  if (key === "expenses") {
    return deltaAmount > 0 ? "attention" : "positive";
  }

  if (key === "savings" || key === "finalBalance") {
    return deltaAmount > 0 ? "positive" : "attention";
  }

  if (key === "debtPayments") {
    return deltaAmount > 0 ? "neutral" : "positive";
  }

  return deltaAmount > 0 ? "positive" : "attention";
}

function toneClasses(tone: ComparisonTone) {
  if (tone === "positive") {
    return {
      row: "border-emerald-200 bg-emerald-50/65",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-800",
    };
  }

  if (tone === "attention") {
    return {
      row: "border-amber-200 bg-amber-50/70",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-800",
    };
  }

  return {
    row: "border-eb-stroke/25 bg-white/75",
    icon: "bg-eb-accentSoft/55 text-eb-accent",
    value: "text-eb-text",
  };
}

function expenseCategoryTone(deltaAmount: number | null): ExpenseCategoryTone {
  if (deltaAmount == null || deltaAmount === 0) return "neutral";

  return deltaAmount > 0 ? "attention" : "positive";
}

function carryOverLabel(
  recap: BudgetMonthRecapDto,
  currency: CurrencyCode,
  locale: string,
  t: RecapT,
) {
  if (recap.month.carryOverMode === "none" || recap.month.carryOverAmount == null) {
    return t("carryOverNone");
  }

  return formatSnapshotMoney(recap.month.carryOverAmount, currency, locale);
}

function carryOverDescription(recap: BudgetMonthRecapDto, t: RecapT) {
  if (recap.month.carryOverMode === "none" || recap.month.carryOverAmount == null) {
    return t("carryOverNoneDescription");
  }

  return t("carryOverAppliedDescription");
}

function formatCarryOverMode(
  mode: BudgetMonthRecapDto["month"]["carryOverMode"],
  t: RecapT,
) {
  if (mode === "full") return t("carryOverModeFull");
  if (mode === "custom") return t("carryOverModeCustom");
  return t("carryOverModeNone");
}

function RecapNav({
  previousPeriodLabel,
  nextPeriodLabel,
  canGoPrevious,
  canGoNext,
  onGoPrevious,
  onGoNext,
  isSwitchingMonth,
  t,
}: Pick<
  ClosedMonthRecapSectionProps,
  | "previousPeriodLabel"
  | "nextPeriodLabel"
  | "canGoPrevious"
  | "canGoNext"
  | "onGoPrevious"
  | "onGoNext"
  | "isSwitchingMonth"
> & {
  t: RecapT;
}) {
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
        <span>{previousPeriodLabel ?? t("previous")}</span>
      </button>

      <button
        type="button"
        data-testid="month-nav-next"
        className={buttonClass}
        disabled={!canGoNext || isSwitchingMonth}
        onClick={onGoNext}
      >
        <span>{nextPeriodLabel ?? t("next")}</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function KpiCard({
  label,
  hint,
  value,
  Icon,
  dataTestId,
  ariaLabel,
  isNegative = false,
}: {
  label: string;
  hint: string;
  value: string;
  Icon: LucideIcon;
  dataTestId?: string;
  ariaLabel: string;
  isNegative?: boolean;
}) {
  return (
    <article
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className={cn(
        "min-h-[140px] rounded-2xl border bg-white/80 p-4 shadow-sm ring-1 ring-white/60",
        isNegative ? "border-rose-200 bg-rose-50/80" : "border-eb-stroke/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-eb-text/50">
            {label}
          </p>
          <p className="mt-1 text-xs font-medium text-eb-text/50">{hint}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl",
            isNegative
              ? "bg-rose-100 text-rose-700"
              : "bg-eb-accentSoft/60 text-eb-accent",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p
        className={cn(
          "mt-5 text-2xl font-extrabold tracking-normal text-eb-text",
          isNegative && "text-rose-700",
        )}
      >
        {value}
      </p>
    </article>
  );
}

function ComparisonSummaryBlock({
  recap,
  currency,
  locale,
  t,
}: {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  t: RecapT;
}) {
  const previousComparable = recap.comparison.hasPreviousComparableMonth
    ? recap.comparison.previousComparableYearMonth
    : null;
  const summary = recap.comparison.summary;
  const previousMonthLabel = previousComparable
    ? formatYearMonth(previousComparable, locale)
    : null;

  return (
    <article
      aria-label={t("comparisonLabel")}
      data-testid="closed-month-comparison"
      className="mt-4 rounded-2xl border border-eb-stroke/25 bg-white/80 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-eb-accentSoft/60 text-eb-accent">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-eb-text">
              {t("comparisonTitle")}
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
              {previousMonthLabel
                ? replaceToken(t("previousComparable"), "month", previousMonthLabel)
                : t("noPreviousComparable")}
            </p>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
          {comparisonRows.map(({ key, labelKey, Icon }) => {
            const metric = summary[key];
            const label = t(labelKey);
            const tone = comparisonTone(key, metric.deltaAmount);
            const classes = toneClasses(tone);

            return (
              <section
                key={key}
                aria-label={replaceToken(t("comparisonMetricLabel"), "label", label)}
                data-testid={`closed-month-comparison-${key}`}
                data-tone={tone}
                className={cn(
                  "min-h-[132px] rounded-xl border p-4 transition",
                  classes.row,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-eb-text/50">
                      {label}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-eb-text/45">
                      {t("previousValue")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                      classes.icon,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </div>

                <p className="mt-4 text-xs font-semibold text-eb-text/50">
                  {formatSnapshotMoney(metric.previousValue, currency, locale)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-lg font-extrabold tracking-normal",
                    classes.value,
                  )}
                >
                  {formatSignedMoney(metric.deltaAmount, currency, locale)}
                </p>
                {metric.deltaPercent != null ? (
                  <p
                    data-testid={`closed-month-comparison-${key}-percent`}
                    className={cn("mt-1 text-xs font-bold", classes.value)}
                  >
                    {formatSignedPercent(metric.deltaPercent, locale)}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function ExpenseCategoryBreakdownBlock({
  recap,
  currency,
  locale,
  t,
}: {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  t: RecapT;
}) {
  const hasPreviousComparableMonth = recap.comparison.hasPreviousComparableMonth;

  return (
    <article
      aria-label={t("expenseCategoryBreakdownLabel")}
      data-testid="closed-month-expense-categories"
      className="mt-4 rounded-2xl border border-eb-stroke/25 bg-white/80 p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <ReceiptText className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-eb-text">
            {t("expenseCategoryBreakdownTitle")}
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
            {hasPreviousComparableMonth
              ? t("expenseCategoryBreakdownBody")
              : t("expenseCategoryNoPrevious")}
          </p>
        </div>
      </div>

      {recap.expenseCategories.length > 0 ? (
        <div className="mt-4 divide-y divide-eb-stroke/20 overflow-hidden rounded-xl border border-eb-stroke/25 bg-eb-shell/25">
          {recap.expenseCategories.map((category) => {
            const tone = expenseCategoryTone(category.deltaAmount);
            const classes = toneClasses(tone);
            const categoryLabel = labelLedgerItem(category.categoryName, locale);

            return (
              <section
                key={category.categoryId}
                aria-label={replaceToken(
                  t("expenseCategoryRowLabel"),
                  "category",
                  categoryLabel,
                )}
                data-testid={`closed-month-expense-category-${category.categoryId}`}
                data-tone={tone}
                className="grid grid-cols-1 gap-3 bg-white/65 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-eb-text">
                    {categoryLabel}
                  </p>
                  {hasPreviousComparableMonth && category.previousAmount != null ? (
                    <p className="mt-1 text-xs font-semibold text-eb-text/50">
                      {replaceToken(
                        t("expenseCategoryPreviousValue"),
                        "amount",
                        formatSnapshotMoney(
                          category.previousAmount,
                          currency,
                          locale,
                        ),
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="rounded-lg border border-eb-stroke/20 bg-white/80 px-3 py-1.5 text-sm font-extrabold text-eb-text">
                    {formatSnapshotMoney(category.currentAmount, currency, locale)}
                  </span>
                  {category.deltaAmount != null ? (
                    <span
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-extrabold",
                        classes.row,
                        classes.value,
                      )}
                    >
                      {formatSignedMoney(category.deltaAmount, currency, locale)}
                      {category.deltaPercent != null ? (
                        <span
                          data-testid={`closed-month-expense-category-${category.categoryId}-percent`}
                          className="ml-1"
                        >
                          ({formatSignedPercent(category.deltaPercent, locale)})
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div
          data-testid="closed-month-expense-categories-empty"
          className="mt-4 rounded-xl border border-dashed border-eb-stroke/35 bg-eb-shell/35 px-4 py-5 text-sm font-semibold text-eb-text/60"
        >
          {t("expenseCategoryEmpty")}
        </div>
      )}
    </article>
  );
}

function subscriptionGroupTone(group: SubscriptionGroupKey): ComparisonTone {
  if (group === "removed" || group === "cancelled") return "positive";
  if (group === "new" || group === "paused") return "attention";
  return "neutral";
}

function SubscriptionInsightBlock({
  recap,
  currency,
  locale,
  t,
}: {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  t: RecapT;
}) {
  const insight = recap.subscriptionInsight;
  const hasAnySubscriptions =
    insight.active.length > 0 ||
    insight.new.length > 0 ||
    insight.removed.length > 0 ||
    insight.paused.length > 0 ||
    insight.cancelled.length > 0;
  const groups: Array<{
    key: SubscriptionGroupKey;
    label: string;
    items: BudgetMonthRecapDto["subscriptionInsight"]["active"];
    Icon: LucideIcon;
    isNotCounted?: boolean;
  }> = [
    {
      key: "active",
      label: insight.hasPreviousComparableMonth
        ? t("subscriptionStillActive")
        : t("subscriptionActive"),
      items: insight.active,
      Icon: CircleCheck,
    },
    {
      key: "new",
      label: t("subscriptionNew"),
      items: insight.new,
      Icon: PlusCircle,
    },
    {
      key: "paused",
      label: t("subscriptionPaused"),
      items: insight.paused,
      Icon: CirclePause,
      isNotCounted: true,
    },
    {
      key: "cancelled",
      label: t("subscriptionCancelled"),
      items: insight.cancelled,
      Icon: CircleSlash,
      isNotCounted: true,
    },
    {
      key: "removed",
      label: t("subscriptionRemoved"),
      items: insight.removed,
      Icon: CircleMinus,
    },
  ];

  return (
    <article
      aria-label={t("subscriptionChangesLabel")}
      data-testid="closed-month-subscriptions"
      className="mt-4 rounded-2xl border border-eb-stroke/25 bg-white/80 p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Repeat2 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-eb-text">
            {t("subscriptionChangesTitle")}
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
            {insight.hasPreviousComparableMonth
              ? t("subscriptionChangesBody")
              : t("subscriptionNoPrevious")}
          </p>
        </div>
      </div>

      {hasAnySubscriptions ? (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {groups
            .filter((group) => group.items.length > 0)
            .map(({ key, label, items, Icon, isNotCounted }) => {
              const tone = subscriptionGroupTone(key);
              const classes = toneClasses(tone);

              return (
                <section
                  key={key}
                  data-testid={`closed-month-subscriptions-${key}`}
                  data-tone={tone}
                  className={cn("rounded-xl border p-4", classes.row)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                        classes.icon,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-extrabold text-eb-text">
                      {label}
                    </h3>
                  </div>

                  <div className="mt-3 space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.identityKey}
                        aria-label={replaceToken(
                          t("subscriptionRowLabel"),
                          "name",
                          item.name,
                        )}
                        className="flex items-center justify-between gap-3 rounded-lg border border-eb-stroke/20 bg-white/75 px-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-eb-text">
                            {item.name}
                          </span>
                          {isNotCounted ? (
                            <span className="mt-0.5 block text-xs font-semibold text-eb-text/50">
                              {t("subscriptionNotCounted")}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 self-start text-sm font-extrabold text-eb-text">
                          {formatSnapshotMoney(
                            item.amountMonthly,
                            currency,
                            locale,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      ) : (
        <div
          data-testid="closed-month-subscriptions-empty"
          className="mt-4 rounded-xl border border-dashed border-eb-stroke/35 bg-eb-shell/35 px-4 py-5 text-sm font-semibold text-eb-text/60"
        >
          {t("subscriptionEmpty")}
        </div>
      )}
    </article>
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
          t={(key) => tDict(key, locale, closedMonthRecapDict)}
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-eb-text/70">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {tDict("loading", locale, closedMonthRecapDict)}
        </div>
      </section>
    );
  }

  if (!recap) {
    return (
      <DashboardErrorState
        title={tDict("errorTitle", locale, closedMonthRecapDict)}
        message={
          errorMessage ?? tDict("errorMessage", locale, closedMonthRecapDict)
        }
        onRetry={onRetry}
      />
    );
  }

  const t: RecapT = (key) => tDict(key, locale, closedMonthRecapDict);
  const monthLabel = formatYearMonth(recap.month.yearMonth, locale);
  const closedAtLabel = formatDateTime(recap.month.closedAtUtc, locale);
  const finalBalance = recap.snapshotTotals.finalBalanceMonthly;
  const hasDeficit = finalBalance < 0;

  return (
    <section
      data-testid="closed-month-recap"
      aria-labelledby="closed-month-title"
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
        t={t}
      />

      <div className="overflow-hidden rounded-2xl border border-eb-stroke/30 bg-eb-surface/95 shadow-sm">
        <div className="relative p-5 sm:p-6">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-[64px] bg-eb-accentSoft/25" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid="month-status-badge"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200"
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  {t("closed")}
                </span>
                {closedAtLabel ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-eb-text/60">
                    <CalendarCheck className="h-4 w-4" />
                    {replaceToken(t("closedAt"), "date", closedAtLabel)}
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <h1
                  id="closed-month-title"
                  data-testid="active-month-label"
                  className="text-2xl font-extrabold tracking-normal text-eb-text sm:text-3xl"
                >
                  {monthLabel}
                </h1>
                <p
                  data-testid="closed-month-summary"
                  className="max-w-2xl text-sm font-medium leading-6 text-eb-text/70"
                >
                  {t("summary")}
                </p>
              </div>
            </div>

            <div className="relative rounded-2xl border border-eb-stroke/25 bg-white/75 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-eb-text">
                <BadgeCheck className="h-4 w-4 text-emerald-700" />
                {t("readOnlyTitle")}
              </div>
              <p className="mt-1 text-xs font-medium leading-5 text-eb-text/60">
                {t("readOnlyBody")}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-eb-stroke/20 bg-eb-shell/25 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {totalCards.map(({ key, labelKey, hintKey, Icon }) => {
              const label = t(labelKey);
              const value = recap.snapshotTotals[key];
              const isNegativeFinalBalance =
                key === "finalBalanceMonthly" && value < 0;

              return (
                <KpiCard
                  key={key}
                  label={label}
                  hint={t(hintKey)}
                  value={formatSnapshotMoney(value, currency, locale)}
                  Icon={Icon}
                  dataTestId={`closed-month-total-${key}`}
                  ariaLabel={replaceToken(
                    t("snapshotTotalLabel"),
                    "label",
                    label,
                  )}
                  isNegative={isNegativeFinalBalance}
                />
              );
            })}
          </div>

          <ComparisonSummaryBlock
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />

          <ExpenseCategoryBreakdownBlock
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />

          <SubscriptionInsightBlock
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />

          <SavingsDetailBlock
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />

          <DebtDetailBlock
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
            <article
              aria-label={t("carryOverOutcomeLabel")}
              className="rounded-2xl border border-eb-stroke/25 bg-white/80 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      <ArrowRightLeft className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-eb-text/50">
                        {t("carryOver")}
                      </p>
                      <h2 className="text-lg font-extrabold text-eb-text">
                        {t("carryOverOutcomeTitle")}
                      </h2>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm font-medium leading-6 text-eb-text/60">
                    {carryOverDescription(recap, t)}
                  </p>
                </div>

                <div className="rounded-xl border border-eb-stroke/25 bg-eb-shell/40 px-4 py-3 sm:min-w-52">
                  <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/50">
                    {formatCarryOverMode(recap.month.carryOverMode, t)}
                  </p>
                  <p
                    data-testid="closed-month-carry-over"
                    className="mt-1 text-xl font-extrabold text-eb-text"
                  >
                    {carryOverLabel(recap, currency, locale, t)}
                  </p>
                </div>
              </div>
            </article>

            {hasDeficit ? (
              <article
                aria-label={t("deficitGuidanceLabel")}
                className="rounded-2xl border border-rose-200 bg-rose-50/85 p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                    <TrendingDown className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-rose-800">
                      {t("deficitTitle")}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-rose-800/75">
                      {t("deficitBody")}
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <article
                aria-label={t("snapshotContextLabel")}
                className="rounded-2xl border border-eb-stroke/25 bg-white/75 p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-eb-accentSoft/60 text-eb-accent">
                    <ChartNoAxesColumn className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-eb-text">
                      {t("snapshotContextTitle")}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-eb-text/60">
                      {t("snapshotContextBody")}
                    </p>
                  </div>
                </div>
              </article>
            )}
          </div>

          <div
            aria-label={t("futureVisualsLabel")}
            className="mt-4 rounded-2xl border border-dashed border-eb-stroke/35 bg-white/45 px-5 py-4"
          >
            <div className="flex items-center gap-3 text-sm font-semibold text-eb-text/60">
              <ChartNoAxesColumn className="h-4 w-4" />
              <span>{t("futureVisuals")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
