import DashboardErrorState from "@/components/organisms/dashboard/DashboardErrorState";
import {
  DebtDetailBlock,
  SavingsDetailBlock,
} from "@/components/organisms/dashboard/recap/ClosedMonthRecapDetailBlocks";
import ClosedMonthRecapChartCard, {
  type ClosedMonthRecapChartTab,
} from "@/components/organisms/dashboard/recap/ClosedMonthRecapChartCard";
import ClosedMonthReviewHero from "@/components/organisms/dashboard/recap/ClosedMonthReviewHero";
import { cn } from "@/lib/utils";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { type ReactNode, useEffect, useState } from "react";
import {
  ArrowRight,
  Landmark,
  LoaderCircle,
  PiggyBank,
  ReceiptText,
  Repeat2,
  TrendingDown,
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
};

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;

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

function formatNextYearMonth(value: string, locale: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month ?? 1, 1);

  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function computeNextYearMonth(value: string): string {
  // Increments "YYYY-MM" by one calendar month, rolling over to next year.
  const [year, month] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return value;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function formatSnapshotMoney(
  value: number,
  currency: CurrencyCode,
  locale: string,
) {
  return formatMoneyV2(value, currency, locale);
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
        "min-h-[112px] rounded-2xl border bg-white/70 p-3.5 ring-1 ring-white/60",
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
              : "bg-eb-shell/70 text-eb-text/52",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p
        className={cn(
          "mt-5 text-2xl font-extrabold tracking-normal text-eb-text",
          "sm:text-xl",
          isNegative && "text-rose-700",
        )}
      >
        {value}
      </p>
    </article>
  );
}

type SubscriptionGroupTone = "neutral" | "attention" | "positive";
type SubscriptionGroupKeyId =
  | "active"
  | "new"
  | "removed"
  | "paused"
  | "cancelled";

function subscriptionMetaStrip(
  insight: BudgetMonthRecapDto["subscriptionInsight"],
  t: RecapT,
): string {
  const activeCount = insight.active.length;
  const newCount = insight.new.length;
  // Group removed + paused + cancelled together for the metadata strip
  // since they all read as "no longer charging this month" in the calm summary.
  const removedTotal =
    insight.removed.length + insight.paused.length + insight.cancelled.length;

  const activeText = replaceToken(
    activeCount === 1
      ? t("subscriptionMetaActiveSingular")
      : t("subscriptionMetaActive"),
    "count",
    String(activeCount),
  );
  const newText = replaceToken(
    newCount === 1
      ? t("subscriptionMetaNew")
      : t("subscriptionMetaNewPlural"),
    "count",
    String(newCount),
  );
  const removedText = replaceToken(
    removedTotal === 1
      ? t("subscriptionMetaRemovedSingular")
      : t("subscriptionMetaRemoved"),
    "count",
    String(removedTotal),
  );

  return `${activeText} · ${newText} · ${removedText}`;
}

function SubscriptionRow({
  name,
  amount,
  currency,
  locale,
  notCountedLabel,
  ariaLabel,
}: {
  name: string;
  amount: number;
  currency: CurrencyCode;
  locale: AppLocale;
  notCountedLabel?: string;
  ariaLabel: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-eb-text">{name}</p>
        {notCountedLabel ? (
          <p className="mt-0.5 truncate text-xs font-medium text-eb-text/55">
            {notCountedLabel}
          </p>
        ) : null}
      </div>
      <p className="shrink-0 text-sm font-extrabold tabular-nums text-eb-text">
        {formatSnapshotMoney(amount, currency, locale)}
      </p>
    </div>
  );
}

function SubscriptionGroup({
  groupKey,
  label,
  items,
  tone,
  currency,
  locale,
  notCountedLabel,
  rowAriaLabelTemplate,
}: {
  groupKey: SubscriptionGroupKeyId;
  label: string;
  items: BudgetMonthRecapDto["subscriptionInsight"]["active"];
  tone: SubscriptionGroupTone;
  currency: CurrencyCode;
  locale: AppLocale;
  notCountedLabel?: string;
  rowAriaLabelTemplate: string;
}) {
  if (items.length === 0) return null;

  const toneDot =
    tone === "positive"
      ? "bg-emerald-500"
      : tone === "attention"
        ? "bg-amber-500"
        : "bg-eb-text/30";

  return (
    <section
      data-testid={`closed-month-subscriptions-${groupKey}`}
      data-tone={tone}
      className="overflow-hidden rounded-xl border border-eb-stroke/15 bg-white/75"
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDot)} />
          <h3 className="truncate text-xs font-extrabold uppercase tracking-[0.08em] text-eb-text/55">
            {label}
          </h3>
        </div>
        <span className="shrink-0 text-xs font-bold tabular-nums text-eb-text/45">
          {items.length}
        </span>
      </header>
      <div className="divide-y divide-eb-stroke/12">
        {items.map((item) => (
          <SubscriptionRow
            key={item.identityKey}
            name={item.name}
            amount={item.amountMonthly}
            currency={currency}
            locale={locale}
            notCountedLabel={notCountedLabel}
            ariaLabel={replaceToken(rowAriaLabelTemplate, "name", item.name)}
          />
        ))}
      </div>
    </section>
  );
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

  const activeLabel = insight.hasPreviousComparableMonth
    ? t("subscriptionStillActive")
    : t("subscriptionActive");

  return (
    <article
      aria-label={t("subscriptionChangesLabel")}
      data-testid="closed-month-subscriptions"
      className="rounded-2xl border border-eb-stroke/20 bg-white/85 p-4 sm:p-5"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Repeat2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-eb-text">
              {t("subscriptionChangesTitle")}
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
              {t("subscriptionChangesBody")}
            </p>
          </div>
        </div>
        {hasAnySubscriptions ? (
          <p
            data-testid="closed-month-subscriptions-meta"
            className="rounded-lg border border-eb-stroke/15 bg-white px-3 py-1.5 text-xs font-bold text-eb-text/65 sm:self-start"
          >
            {subscriptionMetaStrip(insight, t)}
          </p>
        ) : null}
      </header>

      {hasAnySubscriptions ? (
        <div className="mt-4 space-y-2.5">
          <SubscriptionGroup
            groupKey="active"
            label={activeLabel}
            items={insight.active}
            tone="neutral"
            currency={currency}
            locale={locale}
            rowAriaLabelTemplate={t("subscriptionRowLabel")}
          />
          <SubscriptionGroup
            groupKey="new"
            label={t("subscriptionNew")}
            items={insight.new}
            tone="attention"
            currency={currency}
            locale={locale}
            rowAriaLabelTemplate={t("subscriptionRowLabel")}
          />
          <SubscriptionGroup
            groupKey="paused"
            label={t("subscriptionPaused")}
            items={insight.paused}
            tone="attention"
            currency={currency}
            locale={locale}
            notCountedLabel={t("subscriptionNotCounted")}
            rowAriaLabelTemplate={t("subscriptionRowLabel")}
          />
          <SubscriptionGroup
            groupKey="cancelled"
            label={t("subscriptionCancelled")}
            items={insight.cancelled}
            tone="positive"
            currency={currency}
            locale={locale}
            notCountedLabel={t("subscriptionNotCounted")}
            rowAriaLabelTemplate={t("subscriptionRowLabel")}
          />
          <SubscriptionGroup
            groupKey="removed"
            label={t("subscriptionRemoved")}
            items={insight.removed}
            tone="positive"
            currency={currency}
            locale={locale}
            rowAriaLabelTemplate={t("subscriptionRowLabel")}
          />
        </div>
      ) : (
        <p
          data-testid="closed-month-subscriptions-empty"
          className="mt-4 text-sm font-medium text-eb-text/55"
        >
          {t("subscriptionEmpty")}
        </p>
      )}
    </article>
  );
}

function DetailChapter({
  children,
  t,
}: {
  children: ReactNode;
  t: RecapT;
}) {
  return (
    <section
      data-testid="closed-month-detail-layer"
      aria-labelledby="closed-month-detail-title"
      className="space-y-4"
    >
      <header className="space-y-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eb-text/45">
          {t("detailChapterEyebrow")}
        </p>
        <div className="max-w-2xl">
          <h2
            id="closed-month-detail-title"
            className="text-xl font-extrabold tracking-tight text-eb-text sm:text-2xl"
          >
            {t("detailChapterTitle")}
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
            {t("detailChapterBody")}
          </p>
        </div>
      </header>

      <div
        aria-label={t("detailSurfaceLabel")}
        className="rounded-3xl border border-sky-100/70 bg-sky-50/30 p-3 ring-1 ring-white/70 sm:p-4 lg:p-5"
      >
        <div className="space-y-3 sm:space-y-4">{children}</div>
      </div>
    </section>
  );
}

function NextStepCard({
  recap,
  currency,
  locale,
  nextMonthLabel,
  nextYearMonth,
  hasDeficit,
  onContinue,
  t,
}: {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  nextMonthLabel: string;
  nextYearMonth: string;
  hasDeficit: boolean;
  onContinue: (yearMonth: string) => void;
  t: RecapT;
}) {
  const carryOverAmount = recap.month.carryOverAmount ?? 0;
  const hasCarryOver =
    recap.month.carryOverMode !== "none" && carryOverAmount > 0;

  const carryOverText = hasCarryOver
    ? replaceToken(
        replaceToken(
          t("nextStepCarryOverApplied"),
          "amount",
          formatSnapshotMoney(carryOverAmount, currency, locale),
        ),
        "month",
        nextMonthLabel,
      )
    : replaceToken(t("nextStepCarryOverNone"), "month", nextMonthLabel);

  const ctaLabel = replaceToken(t("nextStepCta"), "month", nextMonthLabel);

  return (
    <article
      data-testid="closed-month-next-step"
      aria-label={t("nextStepLabel")}
      className="rounded-2xl border border-eb-stroke/20 bg-white/95 p-4 shadow-eb sm:p-5"
    >
      {hasDeficit ? (
        <div
          data-testid="closed-month-next-step-deficit"
          role="article"
          aria-label={t("deficitGuidanceLabel")}
          className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-800"
        >
          <TrendingDown className="h-3.5 w-3.5 shrink-0" />
          <span>{t("deficitTitle")}</span>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-eb-text/52">
            {t("nextStepLabel")}
          </p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-eb-text">
            {t("nextStepTitle")}
          </h2>
          <p
            data-testid="closed-month-carry-over"
            className="mt-1 text-sm font-semibold leading-6 text-eb-text/70"
          >
            {carryOverText}
          </p>
        </div>
        <button
          type="button"
          data-testid="closed-month-next-step-cta"
          onClick={() => onContinue(nextYearMonth)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors",
            "bg-eb-text text-white hover:bg-eb-text/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          )}
        >
          <span>{ctaLabel}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
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
}: ClosedMonthRecapSectionProps) {
  const [selectedChartTab, setSelectedChartTab] =
    useState<ClosedMonthRecapChartTab>("compare");
  const setSelectedYearMonth = useBudgetMonthStore(
    (s) => s.setSelectedYearMonth,
  );
  const hasComparableChart =
    recap?.comparison.hasPreviousComparableMonth === true &&
    recap.comparison.summary != null;

  useEffect(() => {
    if (selectedChartTab === "compare" && !hasComparableChart) {
      setSelectedChartTab("categories");
    }
  }, [hasComparableChart, selectedChartTab]);

  if (isLoading) {
    return (
      <section
        data-testid="closed-month-recap"
        className="w-full space-y-4 rounded-2xl border border-eb-stroke/30 bg-eb-surface/90 p-5 shadow-sm"
      >
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
  const nextMonthLabel = formatNextYearMonth(recap.month.yearMonth, locale);
  const nextYearMonth = computeNextYearMonth(recap.month.yearMonth);
  const closedAtLabel = formatDateTime(recap.month.closedAtUtc, locale);
  const finalBalance = recap.snapshotTotals.finalBalanceMonthly;
  const hasDeficit = finalBalance < 0;

  return (
    <section
      data-testid="closed-month-recap"
      aria-labelledby="closed-month-title"
      className="w-full space-y-5"
    >
      <ClosedMonthReviewHero
        recap={recap}
        currency={currency}
        locale={locale}
        closedAtLabel={closedAtLabel}
        monthLabel={monthLabel}
        nextMonthLabel={nextMonthLabel}
        t={t}
      />

      <div className="overflow-hidden rounded-2xl border border-eb-stroke/30 bg-eb-surface/95 shadow-sm">
        <div className="space-y-7 border-t-0 bg-eb-shell/20 p-4 sm:p-5 sm:space-y-8">
          <section aria-label={t("snapshotTotalsHeading")}>
            <header className="mb-3">
              <h2 className="text-base font-extrabold text-eb-text">
                {t("snapshotTotalsHeading")}
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
                {t("snapshotTotalsBody")}
              </p>
            </header>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {totalCards.map(({ key, labelKey, hintKey, Icon }) => {
                const label = t(labelKey);
                const value = recap.snapshotTotals[key];

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
                  />
                );
              })}
            </div>
          </section>

          <ClosedMonthRecapChartCard
            recap={recap}
            currency={currency}
            locale={locale}
            t={t}
            selectedTab={selectedChartTab}
            onSelectedTabChange={setSelectedChartTab}
          />

          <DetailChapter t={t}>
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

            <NextStepCard
              recap={recap}
              currency={currency}
              locale={locale}
              nextMonthLabel={nextMonthLabel}
              nextYearMonth={nextYearMonth}
              hasDeficit={hasDeficit}
              onContinue={setSelectedYearMonth}
              t={t}
            />
          </DetailChapter>

        </div>
      </div>
    </section>
  );
}
