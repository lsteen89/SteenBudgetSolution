import { cn } from "@/lib/utils";
import ClosedMonthFlowSurface from "@/components/organisms/dashboard/recap/ClosedMonthFlowSurface";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  BarChart3,
  ChartNoAxesColumn,
  ReceiptText,
  Scale,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

export type ClosedMonthRecapChartTab = "flow" | "compare" | "categories";

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;
type ComparisonMetricKey = keyof NonNullable<
  BudgetMonthRecapDto["comparison"]["summary"]
>;

type ClosedMonthRecapChartCardProps = {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  t: RecapT;
  selectedTab: ClosedMonthRecapChartTab;
  onSelectedTabChange: (tab: ClosedMonthRecapChartTab) => void;
};

type ChartTabOption = {
  value: ClosedMonthRecapChartTab;
  labelKey: RecapTKey;
  disabled?: boolean;
};

const comparisonMetrics: Array<{
  key: ComparisonMetricKey;
  labelKey: RecapTKey;
  Icon: LucideIcon;
  snapshotKey: keyof BudgetMonthRecapDto["snapshotTotals"];
}> = [
  {
    key: "income",
    labelKey: "income",
    Icon: WalletCards,
    snapshotKey: "totalIncomeMonthly",
  },
  {
    key: "expenses",
    labelKey: "expenses",
    Icon: ReceiptText,
    snapshotKey: "totalExpensesMonthly",
  },
  {
    key: "savings",
    labelKey: "savings",
    Icon: BarChart3,
    snapshotKey: "totalSavingsMonthly",
  },
  {
    key: "debtPayments",
    labelKey: "debtPayments",
    Icon: Scale,
    snapshotKey: "totalDebtPaymentsMonthly",
  },
  {
    key: "finalBalance",
    labelKey: "finalBalance",
    Icon: ChartNoAxesColumn,
    snapshotKey: "finalBalanceMonthly",
  },
] as const;

function replaceToken(value: string, token: string, replacement: string) {
  return value.replace(`{${token}}`, replacement);
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
): "positive" | "attention" | "neutral" {
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

function toneTextClass(tone: "positive" | "attention" | "neutral") {
  if (tone === "positive") return "text-emerald-800";
  if (tone === "attention") return "text-amber-800";
  return "text-eb-text";
}

function barToneColor(tone: "positive" | "attention" | "neutral") {
  if (tone === "positive") return "#047857";
  if (tone === "attention") return "#b45309";
  return "#3c6175";
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: TooltipProps<number, string> & {
  currency: CurrencyCode;
  locale: AppLocale;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-eb-stroke/25 bg-white/95 px-3 py-2 text-sm shadow-lg">
      <p className="font-extrabold text-eb-text">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((item) => (
          <p key={item.dataKey?.toString()} className="font-semibold text-eb-text/70">
            <span
              className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name}:{" "}
            <span className="text-eb-text">
              {formatSnapshotMoney(Number(item.value) || 0, currency, locale)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-eb-stroke/35 bg-eb-shell/35 px-4 text-center text-sm font-semibold leading-6 text-eb-text/60">
      {message}
    </div>
  );
}

function ClosedMonthRecapCompareChart({
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
  const summary = recap.comparison.summary;
  const previousMonthLabel = recap.comparison.previousComparableYearMonth
    ? formatYearMonth(recap.comparison.previousComparableYearMonth, locale)
    : null;

  if (!summary || !recap.comparison.hasPreviousComparableMonth) {
    return <ChartEmptyState message={t("chartCompareUnavailable")} />;
  }

  const data = comparisonMetrics.map(({ key, labelKey, snapshotKey }) => ({
    key,
    label: t(labelKey),
    current: recap.snapshotTotals[snapshotKey],
    previous: summary[key].previousValue,
  }));

  return (
    <div data-testid="closed-month-comparison" className="min-h-[330px] space-y-4">
      <p className="text-sm font-medium leading-6 text-eb-text/60">
        {previousMonthLabel
          ? replaceToken(t("previousComparable"), "month", previousMonthLabel)
          : t("noPreviousComparable")}
      </p>

      <div className="h-[250px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={250}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#d7e0e5" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#50626d", fontSize: 11, fontWeight: 700 }} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
            <Bar dataKey="previous" name={t("previousValue")} fill="#c9d6dd" radius={[8, 8, 0, 0]} />
            <Bar dataKey="current" name={t("chartCurrentValue")} fill="#2f6074" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
        {comparisonMetrics.map(({ key, labelKey, Icon }) => {
          const metric = summary[key];
          const tone = comparisonTone(key, metric.deltaAmount);

          return (
            <div
              key={key}
              data-testid={`closed-month-comparison-${key}`}
              data-tone={tone}
              className="rounded-xl border border-eb-stroke/20 bg-white/70 p-3"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-eb-text/50" />
                <p className="truncate text-xs font-bold uppercase tracking-wide text-eb-text/50">
                  {t(labelKey)}
                </p>
              </div>
              <p className={cn("mt-2 text-sm font-extrabold", toneTextClass(tone))}>
                {formatSignedMoney(metric.deltaAmount, currency, locale)}
              </p>
              {metric.deltaPercent != null ? (
                <p
                  data-testid={`closed-month-comparison-${key}-percent`}
                  className={cn("mt-0.5 text-xs font-bold", toneTextClass(tone))}
                >
                  {formatSignedPercent(metric.deltaPercent, locale)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClosedMonthRecapCategoriesChart({
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
  const categories = recap.expenseCategories
    .filter((category) => category.currentAmount > 0 || (category.previousAmount ?? 0) > 0)
    .slice(0, 6)
    .map((category) => ({
      ...category,
      label: labelLedgerItem(category.categoryName, locale),
      tone: category.deltaAmount == null
        ? "neutral"
        : comparisonTone("expenses", category.deltaAmount),
    }));

  if (categories.length === 0) {
    return (
      <div data-testid="closed-month-expense-categories">
        <ChartEmptyState message={t("expenseCategoryEmpty")} />
      </div>
    );
  }

  return (
    <div data-testid="closed-month-expense-categories" className="min-h-[330px] space-y-4">
      <p className="text-sm font-medium leading-6 text-eb-text/60">
        {hasPreviousComparableMonth
          ? t("expenseCategoryBreakdownBody")
          : t("expenseCategoryNoPrevious")}
      </p>

      <div className="h-[250px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={250}>
          <BarChart
            data={categories}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
          >
            <CartesianGrid stroke="#d7e0e5" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={118}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#50626d", fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
            {hasPreviousComparableMonth ? (
              <Bar dataKey="previousAmount" name={t("previousValue")} fill="#c9d6dd" radius={[0, 8, 8, 0]} />
            ) : null}
            <Bar dataKey="currentAmount" name={t("chartCurrentValue")} radius={[0, 8, 8, 0]}>
              {categories.map((category) => (
                <Cell key={category.categoryId} fill={barToneColor(category.tone)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {categories.map((category) => (
          <div
            key={category.categoryId}
            data-testid={`closed-month-expense-category-${category.categoryId}`}
            data-tone={category.tone}
            className="flex items-center justify-between gap-3 rounded-xl border border-eb-stroke/20 bg-white/70 px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold text-eb-text">
                {category.label}
              </span>
              {hasPreviousComparableMonth && category.previousAmount != null ? (
                <span className="mt-0.5 block text-xs font-semibold text-eb-text/50">
                  {replaceToken(
                    t("expenseCategoryPreviousValue"),
                    "amount",
                    formatSnapshotMoney(category.previousAmount, currency, locale),
                  )}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-extrabold text-eb-text">
                {formatSnapshotMoney(category.currentAmount, currency, locale)}
              </span>
              {category.deltaAmount != null ? (
                <span className={cn("block text-xs font-bold", toneTextClass(category.tone))}>
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
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClosedMonthRecapChartSwitcher({
  tabs,
  selectedTab,
  onSelectedTabChange,
  t,
}: {
  tabs: ChartTabOption[];
  selectedTab: ClosedMonthRecapChartTab;
  onSelectedTabChange: (tab: ClosedMonthRecapChartTab) => void;
  t: RecapT;
}) {
  return (
    <div
      role="tablist"
      aria-label={t("chartSwitcherLabel")}
      className="inline-flex w-full rounded-full border border-eb-stroke/25 bg-eb-shell/55 p-1 sm:w-auto"
    >
      {tabs.map((tab) => {
        const isSelected = selectedTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`closed-month-chart-panel-${tab.value}`}
            disabled={tab.disabled}
            data-testid={`closed-month-chart-tab-${tab.value}`}
            className={cn(
              "min-h-9 flex-1 rounded-full px-3 text-sm font-extrabold text-eb-text/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eb-accent disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none sm:flex-none",
              isSelected && "bg-white text-eb-text shadow-sm ring-1 ring-eb-stroke/20",
            )}
            onClick={() => onSelectedTabChange(tab.value)}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

export default function ClosedMonthRecapChartCard({
  recap,
  currency,
  locale,
  t,
  selectedTab,
  onSelectedTabChange,
}: ClosedMonthRecapChartCardProps) {
  const canCompare =
    recap.comparison.hasPreviousComparableMonth && recap.comparison.summary != null;
  const tabs: ChartTabOption[] = [
    { value: "flow", labelKey: "chartFlow" },
    { value: "compare", labelKey: "chartCompare", disabled: !canCompare },
    { value: "categories", labelKey: "chartCategories" },
  ];
  const resolvedTab = selectedTab === "compare" && !canCompare ? "flow" : selectedTab;

  return (
    <article
      aria-label={t("chartTitle")}
      data-testid="closed-month-chart-card"
      className="mt-4 rounded-2xl border border-[rgba(199,228,255,0.65)] bg-white/90 p-4 shadow-[0_18px_45px_rgba(21,39,81,0.06)] sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-lg font-extrabold text-eb-text">
            {t("chartTitle")}
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
            {t("chartBody")}
          </p>
        </div>

        <ClosedMonthRecapChartSwitcher
          tabs={tabs}
          selectedTab={resolvedTab}
          onSelectedTabChange={onSelectedTabChange}
          t={t}
        />
      </div>

      <div
        id={`closed-month-chart-panel-${resolvedTab}`}
        role="tabpanel"
        className="mt-5 min-h-[360px]"
      >
        {resolvedTab === "flow" ? (
          <ClosedMonthFlowSurface
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />
        ) : null}
        {resolvedTab === "compare" ? (
          <ClosedMonthRecapCompareChart
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />
        ) : null}
        {resolvedTab === "categories" ? (
          <ClosedMonthRecapCategoriesChart
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
          />
        ) : null}
      </div>
    </article>
  );
}
