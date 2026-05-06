import GuideBird from "@assets/Images/GuideBird.png";
import ClosedMonthHeroSankey from "@/components/organisms/dashboard/recap/ClosedMonthHeroSankey";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { CalendarCheck, LockKeyhole } from "lucide-react";

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;

type ClosedMonthReviewHeroProps = {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  closedAtLabel: string | null;
  monthLabel: string;
  nextMonthLabel: string;
  t: RecapT;
};

function replaceToken(value: string, token: string, replacement: string) {
  return value.replace(`{${token}}`, replacement);
}

function formatDriverAmount(
  value: number,
  currency: CurrencyCode,
  locale: AppLocale,
) {
  // Driver deltas always represent a positive month-over-month increase, so
  // we prefix with '+' to make the direction obvious in the conclusion line.
  return `+${formatMoneyV2(value, currency, locale)}`;
}

function buildExpenseDriverClause(
  recap: BudgetMonthRecapDto,
  currency: CurrencyCode,
  locale: AppLocale,
  t: RecapT,
): string | null {
  const comparison = recap.comparison;
  if (!comparison.hasPreviousComparableMonth) return null;

  const expensesDelta = comparison.summary?.expenses.deltaAmount ?? 0;
  if (expensesDelta <= 0) return null;

  const drivers = recap.insightDrivers?.expenseIncreaseDrivers ?? [];
  if (drivers.length === 0) return null;

  const [first, second] = drivers;
  const firstName = labelLedgerItem(first.categoryName, locale);
  const firstAmount = formatDriverAmount(first.deltaAmount, currency, locale);

  if (second) {
    const secondName = labelLedgerItem(second.categoryName, locale);
    const secondAmount = formatDriverAmount(
      second.deltaAmount,
      currency,
      locale,
    );

    return replaceToken(
      replaceToken(
        replaceToken(
          replaceToken(t("expenseDriverPair"), "category1", firstName),
          "amount1",
          firstAmount,
        ),
        "category2",
        secondName,
      ),
      "amount2",
      secondAmount,
    );
  }

  return replaceToken(
    replaceToken(t("expenseDriverSingle"), "category", firstName),
    "amount",
    firstAmount,
  );
}

function isCloseToBalance(recap: BudgetMonthRecapDto) {
  const carryOverAmount =
    recap.month.carryOverMode === "none" || recap.month.carryOverAmount == null
      ? 0
      : recap.month.carryOverAmount;
  const availableAmount =
    carryOverAmount + recap.snapshotTotals.totalIncomeMonthly;
  const threshold = Math.max(100, Math.abs(availableAmount) * 0.03);

  return Math.abs(recap.snapshotTotals.finalBalanceMonthly) <= threshold;
}

function buildMonthlyTakeaway(
  recap: BudgetMonthRecapDto,
  currency: CurrencyCode,
  locale: AppLocale,
  t: RecapT,
) {
  const finalBalance = recap.snapshotTotals.finalBalanceMonthly;
  const comparison = recap.comparison.summary;
  const driverClause = buildExpenseDriverClause(recap, currency, locale, t);

  const appendDriver = (leadIn: string) =>
    driverClause ? `${leadIn} ${driverClause}` : leadIn;

  if (finalBalance < 0) {
    // Deficit + expense increase: the driver clause explains the "why".
    return appendDriver(t("heroTakeawayDeficit"));
  }

  if (comparison?.expenses.deltaAmount && comparison.expenses.deltaAmount > 0) {
    return appendDriver(t("heroTakeawayExpensesUp"));
  }

  if (comparison?.savings.deltaAmount && comparison.savings.deltaAmount > 0) {
    return t("heroTakeawaySavingsUp");
  }

  if (isCloseToBalance(recap)) {
    return t("heroTakeawayBalanced");
  }

  return t("heroTakeawayPositive");
}

export default function ClosedMonthReviewHero({
  recap,
  currency,
  locale,
  closedAtLabel,
  monthLabel,
  nextMonthLabel,
  t,
}: ClosedMonthReviewHeroProps) {
  return (
    <header className="overflow-hidden rounded-2xl border border-[rgb(199_228_255_/_0.42)] bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(247,251,255,0.95)_44%,rgba(224,240,255,0.48))] p-4 shadow-[0_24px_70px_rgb(21_39_81_/_0.08)] sm:p-5 lg:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.34fr)_minmax(720px,1fr)] xl:items-stretch">
        <div className="rounded-2xl border border-white/80 bg-white/68 p-5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.88)]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="closed-month-hero-badge"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              {t("closed")}
            </span>
            {closedAtLabel ? (
              <span
                data-testid="closed-month-hero-timestamp"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-eb-text/60"
              >
                <CalendarCheck className="h-4 w-4" />
                {replaceToken(t("closedAt"), "date", closedAtLabel)}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_96px] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_132px] xl:grid-cols-1">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-eb-text/48">
                {t("heroGuideEyebrow")}
              </p>
              <h1
                id="closed-month-title"
                className="mt-1 text-2xl font-extrabold tracking-normal text-eb-text sm:text-3xl"
              >
                {monthLabel}
              </h1>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-eb-text/48">
                  {t("heroTakeawayLabel")}
                </p>
                <p
                  data-testid="closed-month-summary"
                  className="mt-1 text-base font-semibold leading-7 text-eb-text/78"
                >
                  {buildMonthlyTakeaway(recap, currency, locale, t)}
                </p>
              </div>

            </div>

            <img
              src={GuideBird}
              alt=""
              aria-hidden="true"
              className="h-28 w-full object-contain object-bottom sm:h-32 xl:h-40"
            />
          </div>
        </div>

        <ClosedMonthHeroSankey
          recap={recap}
          currency={currency}
          locale={locale}
          nextMonthLabel={nextMonthLabel}
          t={t}
        />
      </div>
    </header>
  );
}
