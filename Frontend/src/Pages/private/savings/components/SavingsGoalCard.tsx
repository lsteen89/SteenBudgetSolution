import CalcBird from "@assets/Images/CalcBird.png";
import GoalBird from "@assets/Images/GoalBird.png";
import RichBird from "@assets/Images/RichBird.png";
import SavingsBird from "@assets/Images/SavingsBird.png";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import {
  deriveSavingsGoal,
  mascotForGoal,
  shouldRenderPlannedMarker,
  type SavingsGoalTone,
  type SavingsMascotKey,
} from "../utils/savingsSoul";
import SavingsGoalActionRow from "./SavingsGoalActionRow";

export type SavingsGoalCardDensity = "regular" | "compact";

type SavingsGoalCardProps = {
  row: BudgetMonthSavingsGoalEditorRowDto;
  readOnly: boolean;
  referenceDate: Date;
  density?: SavingsGoalCardDensity;
  onDeposit: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onMonthly: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onTargetDate: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onRename: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onChangeTarget: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onArchive: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onRemove: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
};

const MASCOTS: Record<SavingsMascotKey, string> = {
  goalBird: GoalBird,
  savingsBird: SavingsBird,
  calcBird: CalcBird,
  richBird: RichBird,
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function SavingsGoalCard({
  row,
  readOnly,
  referenceDate,
  density = "regular",
  onDeposit,
  onMonthly,
  onTargetDate,
  onRename,
  onChangeTarget,
  onArchive,
  onRemove,
}: SavingsGoalCardProps) {
  const isCompact = density === "compact";
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const derived = deriveSavingsGoal(row, referenceDate);
  const mascotSrc = MASCOTS[mascotForGoal(row)];
  const status = statusFor(derived.tone, derived.monthsLatePositive, t);

  const targetDateLabel = formatTargetDate(row.targetDate, locale);
  const savedValue = row.amountSaved ?? 0;
  const savedFormatted = formatMoneyV2(savedValue, currency, locale, {
    fractionDigits: moneyDecimalsFor(savedValue),
  });
  const targetFormatted =
    row.targetAmount != null
      ? formatMoneyV2(row.targetAmount, currency, locale, {
          fractionDigits: moneyDecimalsFor(row.targetAmount),
        })
      : null;
  const monthlyFormatted = formatMoneyV2(
    row.monthlyContribution,
    currency,
    locale,
    { fractionDigits: moneyDecimalsFor(row.monthlyContribution) },
  );

  const subtitle = targetDateLabel
    ? interpolate(t("cardSubtitleWithDate"), { date: targetDateLabel })
    : t("cardSubtitleOngoing");

  const paceText = buildPaceText(row, derived, monthlyFormatted, t);

  return (
    <article
      className={cn(
        "group relative grid gap-4 rounded-[1.75rem]",
        "border border-eb-stroke/40 bg-eb-surface",
        isCompact ? "px-4 py-3 sm:px-4 sm:py-3.5" : "px-4 py-4 sm:px-5 sm:py-5",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "transition duration-150",
        "hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
        isCompact
          ? "sm:grid-cols-[56px_1fr_auto] sm:items-center"
          : "sm:grid-cols-[88px_1fr_auto] sm:items-center",
      )}
      data-testid="savings-goal-card"
      data-density={density}
    >
      <div
        className={cn(
          "relative hidden shrink-0 overflow-hidden rounded-[20px] border border-eb-stroke/40 bg-[rgb(var(--eb-shell)/0.45)] sm:block",
          isCompact ? "h-[56px] w-[56px]" : "h-[88px] w-[88px]",
        )}
      >
        <img
          src={mascotSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full object-contain",
            isCompact ? "p-1" : "p-1.5",
          )}
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold tracking-[-0.01em] text-eb-text sm:text-[17px]">
              {row.name}
            </h3>
            <p className="mt-0.5 text-[13px] text-eb-text/55">
              {subtitle}
              {row.isMonthOnly ? (
                <span className="ml-2 inline-flex rounded-full border border-eb-stroke/40 bg-white/50 px-2 py-0.5 text-[11px] font-semibold text-eb-text/55">
                  {t("monthOnly")}
                </span>
              ) : null}
            </p>
          </div>
          {targetFormatted ? (
            <div className="whitespace-nowrap text-right tabular-nums">
              <span className="text-[15px] font-bold text-eb-text">
                {savedFormatted}
              </span>
              <span className="ml-1 text-[13px] text-eb-text/45">
                / {targetFormatted}
              </span>
            </div>
          ) : (row.amountSaved ?? 0) > 0 ? (
            <div className="whitespace-nowrap text-right text-[15px] font-bold tabular-nums text-eb-text">
              {savedFormatted}
            </div>
          ) : null}
        </div>

        {derived.actualPct != null ? (
          <ProgressTrail
            actualPct={derived.actualPct}
            expectedPct={derived.expectedPct}
          />
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold",
              status.className,
            )}
          >
            {status.label}
          </span>
          {paceText ? (
            <span className="text-[13px] text-eb-text/60">{paceText}</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
        <div className="flex flex-col items-start sm:items-end">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-eb-text/45">
            {t("monthly")}
          </span>
          <span className="text-[20px] font-bold tabular-nums tracking-[-0.015em] text-eb-text sm:text-[22px]">
            {monthlyFormatted}
          </span>
        </div>
        <SavingsGoalActionRow
          row={row}
          readOnly={readOnly}
          baselineSupported={row.canUpdateDefault}
          onDeposit={() => onDeposit(row)}
          onMonthly={() => onMonthly(row)}
          onTargetDate={() => onTargetDate(row)}
          onRename={() => onRename(row)}
          onChangeTarget={() => onChangeTarget(row)}
          onArchive={() => onArchive(row)}
          onRemove={() => onRemove(row)}
        />
      </div>
    </article>
  );
}

function ProgressTrail({
  actualPct,
  expectedPct,
}: {
  actualPct: number;
  expectedPct: number | null;
}) {
  const showExpected = shouldRenderPlannedMarker(actualPct, expectedPct);

  return (
    <div className="relative mt-2.5 h-3 overflow-hidden rounded-full bg-eb-stroke/55">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${Math.min(100, actualPct * 100)}%`,
          background:
            "linear-gradient(to right, rgb(var(--eb-accent-soft)), rgb(var(--eb-accent)))",
        }}
      />
      {showExpected ? (
        <div
          className="absolute bottom-0 top-0 w-0.5 rounded-sm bg-eb-text/55"
          style={{
            left: `calc(${(expectedPct as number) * 100}% - 1px)`,
          }}
          aria-hidden="true"
        />
      ) : null}
      <div
        className="absolute -bottom-0.5 -top-0.5 w-0.5 rounded-sm bg-eb-accent shadow-[0_0_0_2px_rgb(var(--eb-surface))]"
        style={{ left: `calc(${Math.min(100, actualPct * 100)}% - 1px)` }}
        aria-hidden="true"
      />
    </div>
  );
}

function statusFor(
  tone: SavingsGoalTone,
  monthsLatePositive: number | null,
  t: <K extends keyof typeof savingsEditorPageDict.sv>(key: K) => string,
): { label: string; className: string } {
  switch (tone) {
    case "ahead":
      return {
        label: t("statusAhead"),
        className: "bg-green-100 text-green-800",
      };
    case "behind":
      return {
        label:
          monthsLatePositive != null && monthsLatePositive > 0
            ? interpolate(t("statusBehindBy"), { months: monthsLatePositive })
            : t("statusBehind"),
        className: "bg-red-100 text-red-800",
      };
    case "ongoing":
      return {
        label: t("statusOngoing"),
        className: "bg-eb-shell/45 text-eb-text/70",
      };
    case "ontrack":
    default:
      return {
        label: t("statusOnTrack"),
        className: "bg-eb-shell/45 text-eb-text/70",
      };
  }
}

function buildPaceText(
  row: BudgetMonthSavingsGoalEditorRowDto,
  derived: ReturnType<typeof deriveSavingsGoal>,
  monthlyFormatted: string,
  t: <K extends keyof typeof savingsEditorPageDict.sv>(key: K) => string,
): string | null {
  if (derived.tone === "ongoing") {
    if (row.monthlyContribution <= 0) return null;
    return interpolate(t("paceOngoing"), { amount: monthlyFormatted });
  }
  if (derived.monthsRemaining == null) return null;

  if (
    derived.tone === "ahead" &&
    derived.monthsLatePositive != null &&
    derived.monthsLatePositive < 0
  ) {
    return interpolate(t("paceAhead"), {
      months: derived.monthsRemaining,
      early: Math.abs(derived.monthsLatePositive),
    });
  }
  if (
    derived.tone === "behind" &&
    derived.monthsLatePositive != null &&
    derived.monthsLatePositive > 0
  ) {
    return interpolate(t("paceBehind"), {
      months: derived.monthsRemaining,
      late: derived.monthsLatePositive,
    });
  }
  return interpolate(t("paceOnTrack"), { months: derived.monthsRemaining });
}

function formatTargetDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return null;
  }
}
