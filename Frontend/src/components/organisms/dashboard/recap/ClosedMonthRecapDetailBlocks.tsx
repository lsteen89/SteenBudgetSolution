import { cn } from "@/lib/utils";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { CheckCircle2, Landmark, PiggyBank, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

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

function deltaToneClasses(tone: DetailTone) {
  if (tone === "positive") return "text-emerald-700";
  if (tone === "attention") return "text-amber-700";
  return "text-eb-text/60";
}

function savingsTone(deltaAmount: number | null): DetailTone {
  if (deltaAmount == null || deltaAmount === 0) return "neutral";
  return deltaAmount > 0 ? "positive" : "attention";
}

function debtPaymentTone(deltaAmount: number | null): DetailTone {
  if (deltaAmount == null || deltaAmount === 0) return "neutral";
  // For debt, paying *more* than before is neutral (still on plan); paying
  // less without context could be a missed payment, so we render as positive
  // (less debt service) by default — match the existing convention.
  return deltaAmount > 0 ? "neutral" : "positive";
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wide text-eb-text/45">
        {label}
      </span>
      <span className="font-bold tabular-nums text-eb-text/80">{value}</span>
    </span>
  );
}

function ProgressBar({
  current,
  target,
  ariaLabel,
}: {
  current: number;
  target: number;
  ariaLabel: string;
}) {
  const ratio = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1 w-full overflow-hidden rounded-full bg-eb-shell/55"
    >
      <div
        className="h-full rounded-full bg-emerald-500/80"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function SectionHeading({
  Icon,
  iconBg,
  iconColor,
  title,
  body,
  meta,
}: {
  Icon: typeof PiggyBank;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            iconBg,
            iconColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-eb-text">{title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-eb-text/60">
            {body}
          </p>
        </div>
      </div>
      {meta ? <div className="sm:self-start">{meta}</div> : null}
    </header>
  );
}

function TotalSummary({
  label,
  value,
  currency,
  locale,
}: {
  label: string;
  value: number;
  currency: CurrencyCode;
  locale: AppLocale;
}) {
  return (
    <div className="rounded-xl border border-eb-stroke/15 bg-white px-3.5 py-2.5 text-right">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-eb-text/45">
        {label}
      </p>
      <p className="mt-0.5 text-base font-extrabold tabular-nums text-eb-text">
        {formatSnapshotMoney(value, currency, locale)}
      </p>
    </div>
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

  let insightSentence: string | null = null;
  if (detail.hasPreviousComparableMonth && totalDelta != null) {
    if (totalDelta > 0) {
      insightSentence = replaceToken(
        t("savingsInsightIncreased"),
        "amount",
        formatSnapshotMoney(Math.abs(totalDelta), currency, locale),
      );
    } else if (totalDelta < 0) {
      insightSentence = replaceToken(
        t("savingsInsightDecreased"),
        "amount",
        formatSnapshotMoney(Math.abs(totalDelta), currency, locale),
      );
    } else {
      insightSentence = t("savingsInsightUnchanged");
    }
  }

  return (
    <article
      aria-label={t("savingsDetailLabel")}
      data-testid="closed-month-savings-detail"
      className="rounded-2xl border border-eb-stroke/20 bg-white/85 p-4 sm:p-5"
    >
      <SectionHeading
        Icon={PiggyBank}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-700"
        title={t("savingsDetailTitle")}
        body={
          detail.hasPreviousComparableMonth
            ? t("savingsDetailBody")
            : t("savingsDetailNoPrevious")
        }
        meta={
          <TotalSummary
            label={t("savingsDetailTotal")}
            value={detail.totalSavingsMonthly}
            currency={currency}
            locale={locale}
          />
        }
      />

      {insightSentence ? (
        <p
          data-testid="closed-month-savings-insight"
          className="mt-3 text-sm font-medium text-eb-text/65"
        >
          {insightSentence}
        </p>
      ) : null}

      {hasGoals ? (
        <ul className="mt-4 divide-y divide-eb-stroke/12 overflow-hidden rounded-xl border border-eb-stroke/15 bg-white/70">
          {detail.activeGoals.map((goal) => {
            const goalName = goal.name?.trim() || t("savingsGoalFallback");
            const targetDate = formatMonthDate(goal.targetDate, locale);
            const hasTarget =
              goal.targetAmount != null && goal.targetAmount > 0;
            const currentSaved = goal.amountSaved ?? 0;
            const progressPercent = hasTarget
              ? Math.min(
                  100,
                  Math.round((currentSaved / (goal.targetAmount as number)) * 100),
                )
              : null;
            const deltaTone = savingsTone(goal.deltaMonthlyContribution);

            return (
              <li
                key={goal.id}
                aria-label={replaceToken(
                  t("savingsGoalRowLabel"),
                  "name",
                  goalName,
                )}
                data-testid={`closed-month-savings-goal-${goal.id}`}
                className="px-4 py-3.5"
              >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-eb-text">
                      {goalName}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      {goal.amountSaved != null ? (
                        <MetaItem
                          label={t("savingsGoalSaved")}
                          value={formatSnapshotMoney(
                            currentSaved,
                            currency,
                            locale,
                          )}
                        />
                      ) : null}
                      {goal.targetAmount != null ? (
                        <MetaItem
                          label={t("savingsGoalTarget")}
                          value={formatSnapshotMoney(
                            goal.targetAmount,
                            currency,
                            locale,
                          )}
                        />
                      ) : null}
                      {targetDate ? (
                        <MetaItem
                          label={t("savingsGoalTargetDate")}
                          value={targetDate}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 lg:justify-end">
                    <span className="text-base font-extrabold tabular-nums text-eb-text">
                      {formatSnapshotMoney(
                        goal.monthlyContribution,
                        currency,
                        locale,
                      )}
                    </span>
                    {goal.deltaMonthlyContribution != null ? (
                      <span
                        className={cn(
                          "text-xs font-extrabold tabular-nums",
                          deltaToneClasses(deltaTone),
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
                </div>
                {hasTarget && progressPercent != null ? (
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar
                      current={currentSaved}
                      target={goal.targetAmount as number}
                      ariaLabel={replaceToken(
                        t("savingsGoalProgressLabel"),
                        "percent",
                        String(progressPercent),
                      )}
                    />
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-eb-text/55">
                      {replaceToken(
                        t("savingsGoalProgressLabel"),
                        "percent",
                        String(progressPercent),
                      )}
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          data-testid="closed-month-savings-empty"
          className="mt-4 text-sm font-medium text-eb-text/55"
        >
          {t("savingsDetailEmpty")}
        </p>
      )}
    </article>
  );
}

export function CompletedSavingsGoalsBlock({
  recap,
  currency,
  locale,
  t,
}: RecapDetailBlockProps) {
  const completed = recap.savingsDetail.completedGoals;
  if (!completed || completed.length === 0) return null;

  return (
    <article
      aria-label={t("completedGoalsTitle")}
      data-testid="closed-month-completed-savings-goals"
      className="rounded-2xl border border-eb-stroke/20 bg-white/85 p-4 sm:p-5"
    >
      <SectionHeading
        Icon={CheckCircle2}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-700"
        title={t("completedGoalsTitle")}
        body={t("savingsDetailBody")}
      />

      <ul className="mt-4 divide-y divide-eb-stroke/12 overflow-hidden rounded-xl border border-eb-stroke/15 bg-white/70">
        {completed.map((goal) => {
          const goalName = goal.name?.trim() || t("savingsGoalFallback");
          // Display uses projectedAmountSaved (the value that qualified the
          // goal at close). Raw amountSaved is the stored progression and
          // must not be rendered as the final amount.
          const reached = goal.projectedAmountSaved;
          const hasTarget = goal.targetAmount != null && goal.targetAmount > 0;
          const progressPercent = hasTarget
            ? Math.min(
                100,
                Math.round((reached / (goal.targetAmount as number)) * 100),
              )
            : null;
          const summaryText = replaceToken(
            t("completedGoalsRowSummary"),
            "name",
            goalName,
          );

          return (
            <li
              key={goal.id}
              aria-label={replaceToken(
                t("completedGoalsRowLabel"),
                "name",
                goalName,
              )}
              data-testid={`closed-month-completed-savings-goal-${goal.id}`}
              className="px-4 py-3.5"
            >
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-eb-text">
                    {goalName}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-eb-text/65">
                    {summaryText}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <MetaItem
                      label={t("completedGoalsReachedLabel")}
                      value={formatSnapshotMoney(reached, currency, locale)}
                    />
                    {hasTarget ? (
                      <MetaItem
                        label={t("completedGoalsTargetLabel")}
                        value={formatSnapshotMoney(
                          goal.targetAmount as number,
                          currency,
                          locale,
                        )}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
              {hasTarget && progressPercent != null ? (
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar
                    current={reached}
                    target={goal.targetAmount as number}
                    ariaLabel={replaceToken(
                      t("completedGoalsProgressLabel"),
                      "percent",
                      String(progressPercent),
                    )}
                  />
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-eb-text/55">
                    {replaceToken(
                      t("completedGoalsProgressLabel"),
                      "percent",
                      String(progressPercent),
                    )}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
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
  const hasDebts = detail.activeDebts.length > 0;

  return (
    <article
      aria-label={t("debtDetailLabel")}
      data-testid="closed-month-debt-detail"
      className="rounded-2xl border border-eb-stroke/20 bg-white/85 p-4 sm:p-5"
    >
      <SectionHeading
        Icon={Landmark}
        iconBg="bg-eb-accentSoft/55"
        iconColor="text-eb-accent"
        title={t("debtDetailTitle")}
        body={
          detail.hasPreviousComparableMonth
            ? t("debtDetailBody")
            : t("debtDetailNoPrevious")
        }
        meta={
          <TotalSummary
            label={t("debtDetailTotal")}
            value={detail.totalDebtPaymentsMonthly}
            currency={currency}
            locale={locale}
          />
        }
      />

      {hasDebts ? (
        <ul className="mt-4 divide-y divide-eb-stroke/12 overflow-hidden rounded-xl border border-eb-stroke/15 bg-white/70">
          {detail.activeDebts.map((debt) => {
            const deltaTone = debtPaymentTone(debt.deltaMonthlyPayment);
            // Show the "On plan" badge only when there is a real minimum
            // payment to compare against — otherwise we have no signal.
            const showOnPlanBadge =
              debt.minPayment != null &&
              debt.minPayment > 0 &&
              debt.monthlyPayment >= debt.minPayment;

            return (
              <li
                key={debt.id}
                aria-label={replaceToken(t("debtRowLabel"), "name", debt.name)}
                data-testid={`closed-month-debt-${debt.id}`}
                className="px-4 py-3.5"
              >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-eb-text">
                        {debt.name}
                      </p>
                      {showOnPlanBadge ? (
                        <span
                          data-testid={`closed-month-debt-${debt.id}-on-plan`}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {t("debtPlanCompliantBadge")}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <MetaItem
                        label={t("debtType")}
                        value={formatDebtType(debt.type)}
                      />
                      <MetaItem
                        label={t("debtBalance")}
                        value={formatSnapshotMoney(
                          debt.balance,
                          currency,
                          locale,
                        )}
                      />
                      <MetaItem
                        label={t("debtApr")}
                        value={`${debt.apr.toLocaleString(locale, {
                          maximumFractionDigits: 2,
                        })}%`}
                      />
                      {debt.minPayment != null ? (
                        <MetaItem
                          label={t("debtMinPayment")}
                          value={formatSnapshotMoney(
                            debt.minPayment,
                            currency,
                            locale,
                          )}
                        />
                      ) : null}
                      {debt.monthlyFee != null ? (
                        <MetaItem
                          label={t("debtMonthlyFee")}
                          value={formatSnapshotMoney(
                            debt.monthlyFee,
                            currency,
                            locale,
                          )}
                        />
                      ) : null}
                      {debt.termMonths != null ? (
                        <MetaItem
                          label={t("debtTermMonths")}
                          value={String(debt.termMonths)}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 lg:justify-end">
                    <span className="text-base font-extrabold tabular-nums text-eb-text">
                      {formatSnapshotMoney(
                        debt.monthlyPayment,
                        currency,
                        locale,
                      )}
                    </span>
                    {debt.deltaMonthlyPayment != null ? (
                      <span
                        className={cn(
                          "text-xs font-extrabold tabular-nums",
                          deltaToneClasses(deltaTone),
                        )}
                      >
                        {formatSignedMoney(
                          debt.deltaMonthlyPayment,
                          currency,
                          locale,
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          data-testid="closed-month-debt-empty"
          className="mt-4 text-sm font-medium text-eb-text/55"
        >
          {t("debtDetailEmpty")}
        </p>
      )}
    </article>
  );
}
