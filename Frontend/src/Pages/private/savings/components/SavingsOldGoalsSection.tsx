import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetMonthSavingsGoalArchiveRowDto } from "@/types/budget/BudgetMonthSavingsGoalArchiveRowDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useState } from "react";

type SavingsOldGoalsSectionProps = {
  rows: BudgetMonthSavingsGoalArchiveRowDto[];
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

// Compact, read-only archive of completed and cancelled savings goals on the
// savings editor. Collapsed by default and entirely hidden when there are no
// rows — the active list is the page's primary content. Removed goals are
// already filtered server-side, so this section never sees them.
export default function SavingsOldGoalsSection({
  rows,
}: SavingsOldGoalsSectionProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) return null;

  const count = rows.length;
  const toggleLabel = expanded ? t("oldGoalsCollapse") : t("oldGoalsExpand");

  return (
    <section
      data-testid="savings-old-goals-section"
      data-state={expanded ? "expanded" : "collapsed"}
      className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={toggleLabel}
        data-testid="savings-old-goals-toggle"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-[1.75rem] px-5 py-3.5 text-left transition",
          "hover:bg-white/50",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/30",
        )}
      >
        <span className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-eb-text/80">
            {t("oldGoalsTitle")}
          </span>
          <span
            data-testid="savings-old-goals-count"
            className="text-[12px] font-semibold text-eb-text/55 tabular-nums"
          >
            ({count})
          </span>
        </span>
        <Chevron expanded={expanded} />
      </button>

      {expanded ? (
        <ul
          data-testid="savings-old-goals-list"
          className="grid gap-2 px-3 pb-3 pt-1 sm:px-4 sm:pb-4"
        >
          {rows.map((row) => (
            <SavingsOldGoalRow
              key={row.id}
              row={row}
              locale={locale}
              t={t}
              interpolate={interpolate}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SavingsOldGoalRow({
  row,
  locale,
  t,
  interpolate,
}: {
  row: BudgetMonthSavingsGoalArchiveRowDto;
  locale: string;
  t: <K extends keyof typeof savingsEditorPageDict.sv>(key: K) => string;
  interpolate: (
    template: string,
    values: Record<string, string | number>,
  ) => string;
}) {
  const currency = useAppCurrency();
  const isCompleted = row.closedReason === "completed";
  const statusLabel = isCompleted
    ? t("oldGoalsStatusCompleted")
    : t("oldGoalsStatusCancelled");
  const monthLabel = formatMonthLabel(row.closedAt, locale);
  const closedAtText = monthLabel
    ? interpolate(
        isCompleted ? t("oldGoalsCompletedAt") : t("oldGoalsCancelledAt"),
        { month: monthLabel },
      )
    : null;

  // `amountSavedAtClose` is server-derived (completed → AmountSaved +
  // MonthlyContribution; cancelled → AmountSaved). Never recompute here.
  const savedValue = row.amountSavedAtClose ?? 0;
  const savedFormatted = formatMoneyV2(savedValue, currency, locale, {
    fractionDigits: moneyDecimalsFor(savedValue),
  });
  const targetFormatted =
    row.targetAmount != null
      ? formatMoneyV2(row.targetAmount, currency, locale, {
          fractionDigits: moneyDecimalsFor(row.targetAmount),
        })
      : null;

  return (
    <li
      data-testid="savings-old-goal-row"
      data-closed-reason={row.closedReason}
      className="grid gap-2 rounded-2xl border border-eb-stroke/25 bg-white/60 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-[14px] font-semibold text-eb-text">
            {row.name}
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isCompleted
                ? "bg-green-100 text-green-800"
                : "bg-eb-shell/45 text-eb-text/70",
            )}
            data-testid="savings-old-goal-status"
          >
            {statusLabel}
          </span>
        </div>
        {closedAtText ? (
          <p className="mt-0.5 text-[12px] text-eb-text/55">{closedAtText}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-0.5 text-right tabular-nums">
        {targetFormatted ? (
          <span className="text-[12px] text-eb-text/55">
            {t("oldGoalsTargetLabel")}{" "}
            <span className="font-semibold text-eb-text/75">
              {targetFormatted}
            </span>
          </span>
        ) : null}
        <span className="text-[12px] text-eb-text/55">
          {t("oldGoalsSavedLabel")}{" "}
          <span className="font-semibold text-eb-text/75">{savedFormatted}</span>
        </span>
      </div>
    </li>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      width="16"
      height="16"
      className={cn(
        "shrink-0 text-eb-text/55 transition-transform duration-150",
        expanded ? "rotate-180" : "rotate-0",
      )}
    >
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function formatMonthLabel(value: string | null, locale: string): string | null {
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
