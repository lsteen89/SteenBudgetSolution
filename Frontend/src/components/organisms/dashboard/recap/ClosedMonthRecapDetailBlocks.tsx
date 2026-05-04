import { cn } from "@/lib/utils";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  BadgeDollarSign,
  CalendarDays,
  Landmark,
  PiggyBank,
  Target,
  type LucideIcon,
} from "lucide-react";

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;
type DetailTone = "positive" | "attention" | "neutral";

type RecapDetailBlockProps = {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  t: RecapT;
};

function replaceToken(value: string, token: string, replacement: string) {
  return value.replace(`{${token}}`, replacement);
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

function formatMonthDate(value: string | null | undefined, locale: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
  });
}

function formatDebtType(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function detailToneClasses(tone: DetailTone) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50/70 text-emerald-800";
  }

  if (tone === "attention") {
    return "border-amber-200 bg-amber-50/70 text-amber-800";
  }

  return "border-eb-stroke/25 bg-white/75 text-eb-text";
}

function savingsTone(deltaAmount: number | null): DetailTone {
  if (deltaAmount == null || deltaAmount === 0) return "neutral";
  return deltaAmount > 0 ? "positive" : "attention";
}

function debtPaymentTone(deltaAmount: number | null): DetailTone {
  if (deltaAmount == null || deltaAmount === 0) return "neutral";
  return deltaAmount > 0 ? "neutral" : "positive";
}

function SectionSummary({
  label,
  value,
  deltaAmount,
  tone,
  currency,
  locale,
}: {
  label: string;
  value: number;
  deltaAmount: number | null | undefined;
  tone: DetailTone;
  currency: CurrencyCode;
  locale: AppLocale;
}) {
  return (
    <div className="rounded-xl border border-eb-stroke/20 bg-eb-shell/30 px-3.5 py-3 sm:min-w-52">
      <p className="text-xs font-bold uppercase tracking-wide text-eb-text/50">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-eb-text">
        {formatSnapshotMoney(value, currency, locale)}
      </p>
      {deltaAmount != null ? (
        <span
          className={cn(
            "mt-2 inline-flex rounded-lg border px-2.5 py-1 text-xs font-extrabold",
            detailToneClasses(tone),
          )}
        >
          {formatSignedMoney(deltaAmount, currency, locale)}
        </span>
      ) : null}
    </div>
  );
}

function DetailChip({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon?: LucideIcon;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/65 px-2.5 py-1 text-xs font-bold text-eb-text/65">
      {Icon ? <Icon className="h-3.5 w-3.5 text-eb-text/45" /> : null}
      <span className="text-eb-text/45">{label}</span>
      <span className="text-eb-text">{value}</span>
    </span>
  );
}

export function SavingsDetailBlock({
  recap,
  currency,
  locale,
  t,
}: RecapDetailBlockProps) {
  const detail = recap.savingsDetail;
  const totalDelta = recap.comparison.summary?.savings.deltaAmount ?? null;
  const hasGoals = detail.activeGoals.length > 0;

  return (
    <article
      aria-label={t("savingsDetailLabel")}
      data-testid="closed-month-savings-detail"
      className="mt-4 rounded-2xl border border-eb-stroke/25 bg-white/72 p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <PiggyBank className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-eb-text">
              {t("savingsDetailTitle")}
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
              {detail.hasPreviousComparableMonth
                ? t("savingsDetailBody")
                : t("savingsDetailNoPrevious")}
            </p>
          </div>
        </div>

        <SectionSummary
          label={t("savingsDetailTotal")}
          value={detail.totalSavingsMonthly}
          deltaAmount={totalDelta}
          tone={savingsTone(totalDelta)}
          currency={currency}
          locale={locale}
        />
      </div>

      {hasGoals ? (
        <div className="mt-4 divide-y divide-eb-stroke/20 overflow-hidden rounded-xl border border-eb-stroke/20 bg-eb-shell/20">
          {detail.activeGoals.map((goal) => {
            const goalName = goal.name?.trim() || t("savingsGoalFallback");
            const deltaTone = savingsTone(goal.deltaMonthlyContribution);
            const targetDate = formatMonthDate(goal.targetDate, locale);

            return (
              <section
                key={goal.id}
                aria-label={replaceToken(t("savingsGoalRowLabel"), "name", goalName)}
                data-testid={`closed-month-savings-goal-${goal.id}`}
                className="grid grid-cols-1 gap-3 bg-white/55 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-eb-text">
                    {goalName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {goal.targetAmount != null ? (
                      <DetailChip
                        label={t("savingsGoalTarget")}
                        value={formatSnapshotMoney(goal.targetAmount, currency, locale)}
                        Icon={Target}
                      />
                    ) : null}
                    {goal.amountSaved != null ? (
                      <DetailChip
                        label={t("savingsGoalSaved")}
                        value={formatSnapshotMoney(goal.amountSaved, currency, locale)}
                      />
                    ) : null}
                    {targetDate ? (
                      <DetailChip
                        label={t("savingsGoalTargetDate")}
                        value={targetDate}
                        Icon={CalendarDays}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className="rounded-lg bg-white/70 px-3 py-1.5 text-sm font-extrabold text-eb-text">
                    {formatSnapshotMoney(goal.monthlyContribution, currency, locale)}
                  </span>
                  {goal.deltaMonthlyContribution != null ? (
                    <span
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-extrabold",
                        detailToneClasses(deltaTone),
                      )}
                    >
                      {formatSignedMoney(
                        goal.deltaMonthlyContribution,
                        currency,
                        locale,
                      )}
                    </span>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div
          data-testid="closed-month-savings-empty"
          className="mt-4 rounded-xl border border-dashed border-eb-stroke/35 bg-eb-shell/35 px-4 py-5 text-sm font-semibold text-eb-text/60"
        >
          {t("savingsDetailEmpty")}
        </div>
      )}
    </article>
  );
}

export function DebtDetailBlock({
  recap,
  currency,
  locale,
  t,
}: RecapDetailBlockProps) {
  const detail = recap.debtDetail;
  const totalDelta = recap.comparison.summary?.debtPayments.deltaAmount ?? null;
  const hasDebts = detail.activeDebts.length > 0;

  return (
    <article
      aria-label={t("debtDetailLabel")}
      data-testid="closed-month-debt-detail"
      className="mt-4 rounded-2xl border border-eb-stroke/25 bg-white/72 p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Landmark className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-eb-text">
              {t("debtDetailTitle")}
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
              {detail.hasPreviousComparableMonth
                ? t("debtDetailBody")
                : t("debtDetailNoPrevious")}
            </p>
          </div>
        </div>

        <SectionSummary
          label={t("debtDetailTotal")}
          value={detail.totalDebtPaymentsMonthly}
          deltaAmount={totalDelta}
          tone={debtPaymentTone(totalDelta)}
          currency={currency}
          locale={locale}
        />
      </div>

      {hasDebts ? (
        <div className="mt-4 divide-y divide-eb-stroke/20 overflow-hidden rounded-xl border border-eb-stroke/20 bg-eb-shell/20">
          {detail.activeDebts.map((debt) => {
            const deltaTone = debtPaymentTone(debt.deltaMonthlyPayment);

            return (
              <section
                key={debt.id}
                aria-label={replaceToken(t("debtRowLabel"), "name", debt.name)}
                data-testid={`closed-month-debt-${debt.id}`}
                className="grid grid-cols-1 gap-3 bg-white/55 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-eb-text">
                    {debt.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <DetailChip
                      label={t("debtType")}
                      value={formatDebtType(debt.type)}
                    />
                    <DetailChip
                      label={t("debtBalance")}
                      value={formatSnapshotMoney(debt.balance, currency, locale)}
                    />
                    <DetailChip
                      label={t("debtApr")}
                      value={`${debt.apr.toLocaleString(locale, {
                        maximumFractionDigits: 2,
                      })}%`}
                    />
                    {debt.minPayment != null ? (
                      <DetailChip
                        label={t("debtMinPayment")}
                        value={formatSnapshotMoney(debt.minPayment, currency, locale)}
                      />
                    ) : null}
                    {debt.monthlyFee != null ? (
                      <DetailChip
                        label={t("debtMonthlyFee")}
                        value={formatSnapshotMoney(debt.monthlyFee, currency, locale)}
                        Icon={BadgeDollarSign}
                      />
                    ) : null}
                    {debt.termMonths != null ? (
                      <DetailChip
                        label={t("debtTermMonths")}
                        value={String(debt.termMonths)}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className="rounded-lg bg-white/70 px-3 py-1.5 text-sm font-extrabold text-eb-text">
                    {formatSnapshotMoney(debt.monthlyPayment, currency, locale)}
                  </span>
                  {debt.deltaMonthlyPayment != null ? (
                    <span
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-extrabold",
                        detailToneClasses(deltaTone),
                      )}
                    >
                      {formatSignedMoney(debt.deltaMonthlyPayment, currency, locale)}
                    </span>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div
          data-testid="closed-month-debt-empty"
          className="mt-4 rounded-xl border border-dashed border-eb-stroke/35 bg-eb-shell/35 px-4 py-5 text-sm font-semibold text-eb-text/60"
        >
          {t("debtDetailEmpty")}
        </div>
      )}
    </article>
  );
}
