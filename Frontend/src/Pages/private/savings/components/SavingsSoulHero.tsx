import GoalBird from "@assets/Images/GoalBird.png";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import type { ReactNode } from "react";
import type { SavingsHeroAggregate } from "../utils/savingsSoul";

type SavingsSoulHeroProps = {
  periodLabel: string;
  aggregate: SavingsHeroAggregate;
  /** Steady base monthly savings (Savings.MonthlySavings), separate from goals. */
  baseMonthly: number;
  readOnly: boolean;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function SavingsSoulHero({
  periodLabel,
  aggregate,
  baseMonthly,
  readOnly,
}: SavingsSoulHeroProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  // The hero total is the user-facing sum the page commits to: base habit plus
  // every active goal contribution. The balance strip derives its numbers from
  // the same two inputs, so the two surfaces can never disagree.
  const totalMonthly = baseMonthly + aggregate.totalMonthly;

  const fmt = (value: number) =>
    formatMoneyV2(value, currency, locale, {
      fractionDigits: moneyDecimalsFor(value),
    });

  const totalFormatted = fmt(totalMonthly);
  const baseFormatted = fmt(baseMonthly);
  const goalsFormatted = fmt(aggregate.totalMonthly);
  const savedFormatted = fmt(aggregate.totalSaved);

  const fundedPercent =
    aggregate.totalTarget > 0
      ? Math.round(
          Math.min(1, aggregate.totalSaved / aggregate.totalTarget) * 100,
        )
      : null;

  const insight = buildInsight(aggregate, t);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[2rem]",
        "border border-eb-stroke/20 bg-eb-surface/85",
        "px-5 py-6 sm:px-8 sm:py-8",
        "shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[10%] h-44 w-44 rounded-full bg-[rgb(var(--eb-shell)/0.28)] blur-3xl" />
        <div className="absolute -top-24 right-[18%] h-52 w-52 rounded-full bg-[rgb(var(--eb-accent)/0.10)] blur-3xl" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-[-12px] hidden h-[120px] w-[120px] sm:block lg:right-6 lg:h-[140px] lg:w-[140px]"
      >
        <div
          className="absolute inset-[-14px] blur-md"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 40%, rgb(var(--eb-accent) / 0.18) 0%, transparent 72%)",
          }}
        />
        <img
          src={GoalBird}
          alt=""
          className="relative h-full w-full object-contain"
        />
      </div>

      <div className="relative z-10 max-w-[40rem] pr-0 sm:pr-[140px] lg:pr-[160px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/50">
          {t("eyebrow")} · {periodLabel}
        </p>

        <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-eb-text sm:text-[2rem]">
          {renderHeadline(t("heroHeadline"), totalFormatted)}
        </h1>

        <p
          className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-sm text-eb-text/65 sm:text-[15px]"
          data-testid="savings-hero-split"
        >
          {renderSplitPart(t("heroBaseHabitPart"), baseFormatted)}
          {aggregate.goalCount > 0 ? (
            <>
              <SplitDot />
              {renderSplitPart(
                aggregate.goalCount === 1
                  ? t("heroGoalsPartOne")
                  : t("heroGoalsPartOther"),
                goalsFormatted,
                { count: aggregate.goalCount },
              )}
            </>
          ) : null}
          {aggregate.totalSaved > 0 ? (
            <>
              <SplitDot />
              {renderSplitPart(t("heroSavedSoFar"), savedFormatted)}
            </>
          ) : null}
        </p>

        {fundedPercent != null || insight ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {fundedPercent != null ? (
              <span
                data-testid="savings-hero-funded-pill"
                className="inline-flex items-center gap-2 rounded-full border border-eb-stroke/70 bg-eb-surface/70 px-3 py-1.5 text-[13px] font-bold text-eb-text/75"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <span className="tabular-nums text-eb-text">
                  {interpolate(t("heroFundedPill"), { percent: fundedPercent })}
                </span>
              </span>
            ) : null}
            {insight ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-eb-accent/25 bg-eb-accentSoft px-3 py-1.5 text-[13px] font-semibold text-[#14532d]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                {insight}
              </span>
            ) : null}
          </div>
        ) : null}

        {readOnly ? (
          <div className="mt-4 inline-flex h-9 items-center rounded-full border border-eb-stroke/25 bg-eb-surface px-3 text-sm font-medium text-eb-text/60">
            {t("readOnlyBadge")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SplitDot() {
  return (
    <span
      aria-hidden="true"
      className="h-1 w-1 self-center rounded-full bg-eb-text/30"
    />
  );
}

/**
 * Render a hero subtitle fragment whose `{amount}` placeholder is emphasised in
 * the foreground colour while the surrounding label stays muted.
 */
function renderSplitPart(
  template: string,
  amount: string,
  values?: Record<string, string | number>,
): ReactNode {
  const withValues = values ? interpolate(template, values) : template;
  const [pre, ...rest] = withValues.split("{amount}");
  const post = rest.join("{amount}");
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {pre}
      <strong className="font-semibold tabular-nums text-eb-text">
        {amount}
      </strong>
      {post}
    </span>
  );
}

function renderHeadline(template: string, amount: string) {
  const parts = template.split("{amount}");
  if (parts.length < 2) return template;
  return (
    <>
      {parts[0]}
      <span className="text-eb-accent">{amount}</span>
      {parts.slice(1).join("{amount}")}
    </>
  );
}

function buildInsight(
  aggregate: SavingsHeroAggregate,
  t: <K extends keyof typeof savingsEditorPageDict.sv>(key: K) => string,
): string | null {
  if (aggregate.goalCount === 0) return null;
  if (aggregate.aheadCount === 0 && aggregate.behindCount === 0) {
    return aggregate.totalMonthly > 0 ? t("insightAllOnTrack") : null;
  }
  if (aggregate.aheadCount > 0 && aggregate.behindCount === 0) {
    const ahead = summarizeGoalNames(
      aggregate.aheadGoalNames,
      aggregate.aheadCount,
    );
    if (!ahead.goalName) {
      return interpolate(t("insightAhead"), { count: aggregate.aheadCount });
    }
    return interpolate(
      aggregate.aheadCount === 1
        ? t("insightAheadOne")
        : t("insightAheadOther"),
      {
        goalName: ahead.goalName,
        remaining: ahead.remaining,
        summary: ahead.summary,
      },
    );
  }
  if (aggregate.behindCount > 0 && aggregate.aheadCount === 0) {
    const behind = summarizeGoalNames(
      aggregate.behindGoalNames,
      aggregate.behindCount,
    );
    if (!behind.goalName) {
      return interpolate(t("insightBehind"), { count: aggregate.behindCount });
    }
    return interpolate(
      aggregate.behindCount === 1
        ? t("insightBehindOne")
        : t("insightBehindOther"),
      {
        goalName: behind.goalName,
        remaining: behind.remaining,
        summary: behind.summary,
      },
    );
  }
  const ahead = summarizeGoalNames(
    aggregate.aheadGoalNames,
    aggregate.aheadCount,
  );
  const behind = summarizeGoalNames(
    aggregate.behindGoalNames,
    aggregate.behindCount,
  );
  return interpolate(t("insightMixedNamed"), {
    ahead: ahead.summary,
    behind: behind.summary,
  });
}

function summarizeGoalNames(goalNames: string[], count: number) {
  const firstName = goalNames[0]?.trim();
  if (!firstName) {
    return {
      goalName: null,
      remaining: Math.max(0, count - 1),
      summary: String(count),
    };
  }

  const remaining = Math.max(0, count - 1);
  return {
    goalName: firstName,
    remaining,
    summary: remaining > 0 ? `${firstName} + ${remaining}` : firstName,
  };
}
