import GoalBird from "@assets/Images/GoalBird.png";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { SavingsHeroAggregate } from "../utils/savingsSoul";

type SavingsSoulHeroProps = {
  periodLabel: string;
  aggregate: SavingsHeroAggregate;
  readOnly: boolean;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function SavingsSoulHero({
  periodLabel,
  aggregate,
  readOnly,
}: SavingsSoulHeroProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const monthlyFormatted = formatMoneyV2(aggregate.totalMonthly, currency, locale, {
    fractionDigits: 0,
  });
  const savedFormatted = formatMoneyV2(aggregate.totalSaved, currency, locale, {
    fractionDigits: 0,
  });

  const goalCountLabel = interpolate(
    aggregate.goalCount === 1 ? t("heroGoalCountOne") : t("heroGoalCountOther"),
    { count: aggregate.goalCount },
  );

  const heroLines: string[] = [];
  heroLines.push(goalCountLabel);
  if (aggregate.totalSaved > 0) {
    heroLines.push(interpolate(t("heroSavedSoFar"), { amount: savedFormatted }));
  }
  if (aggregate.nextMilestone) {
    heroLines.push(
      interpolate(t("heroNextMilestoneNamed"), {
        goalName: aggregate.nextMilestone.goalName,
        months: aggregate.nextMilestone.months,
      }),
    );
  }

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

      <div className="relative z-10 max-w-[36rem] pr-0 sm:pr-[140px] lg:pr-[160px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/50">
          {t("eyebrow")} · {periodLabel}
        </p>

        <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-eb-text sm:text-[2rem]">
          {renderHeadline(t("heroHeadline"), monthlyFormatted)}
        </h1>

        <p className="mt-2 text-sm text-eb-text/60 sm:text-[15px]">
          {heroLines.join(" · ")}
        </p>

        {insight ? (
          <div className="mt-4">
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
    return interpolate(t("insightAhead"), { count: aggregate.aheadCount });
  }
  if (aggregate.behindCount > 0 && aggregate.aheadCount === 0) {
    return interpolate(t("insightBehind"), { count: aggregate.behindCount });
  }
  return interpolate(t("insightMixed"), {
    ahead: aggregate.aheadCount,
    behind: aggregate.behindCount,
  });
}
