import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";

const FORECAST_MONTHS = 6;

type SavingsForecastRowProps = {
  /** Start month of the forecast — the open editor month. */
  referenceDate: Date;
  /** Total amount saved across active goals today. */
  totalSaved: number;
  /** Sum of active goal monthly contributions, projected forward. */
  monthlyContribution: number;
};

// A calm, single-row forecast: where the active goal savings land over the next
// six months IF the current plan holds. It is a frontend projection only — no
// backend forecast endpoint exists yet (see MVP report). The current month is
// tinted navy so it reads as "now"; later months use the accent gradient.
export default function SavingsForecastRow({
  referenceDate,
  totalSaved,
  monthlyContribution,
}: SavingsForecastRowProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  // Nothing to project without a positive plan or a valid reference month.
  if (monthlyContribution <= 0) return null;
  if (Number.isNaN(referenceDate.getTime())) return null;

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short" });

  const columns = Array.from({ length: FORECAST_MONTHS }, (_, index) => {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + index,
      1,
    );
    return {
      value: totalSaved + monthlyContribution * index,
      label: monthFormatter.format(date).replace(/\.$/, ""),
      isNow: index === 0,
    };
  });

  const min = columns[0].value;
  const max = columns[columns.length - 1].value;
  const span = max - min;

  return (
    <section
      data-testid="savings-forecast-row"
      aria-label={t("forecastAriaLabel")}
      className="grid gap-2.5 rounded-[1.5rem] border border-dashed border-eb-stroke/60 bg-eb-surface/55 px-4 py-3.5 sm:px-[18px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="m-0 flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-eb-text/60">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M14 7h7v7" />
          </svg>
          {t("forecastTitle")}
        </h3>
        <span className="text-[12.5px] text-eb-text/55">
          {t("forecastSub")}
        </span>
      </div>

      <div className="grid grid-cols-6 items-end gap-2 sm:gap-3">
        {columns.map((column) => {
          const ratio = span > 0 ? (column.value - min) / span : 0;
          const heightPct = 34 + ratio * 66;
          return (
            <div
              key={column.label}
              data-testid="savings-forecast-column"
              data-now={column.isNow || undefined}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="text-[12px] font-extrabold tabular-nums text-eb-text">
                {formatCompact(column.value, locale)}
              </div>
              <div className="flex h-[72px] w-full items-end justify-center sm:h-[104px]">
                <div
                  className={cn(
                    "w-full max-w-[56px] rounded-t-[10px] rounded-b-[4px]",
                    column.isNow
                      ? "bg-[linear-gradient(180deg,rgb(var(--eb-shell-2)/0.7),rgb(var(--eb-shell-3)/0.9))] shadow-[0_6px_14px_rgba(15,23,42,0.18)]"
                      : "bg-[linear-gradient(180deg,rgb(var(--eb-accent)/0.85),rgb(22,163,74,0.95))]",
                  )}
                  style={{ height: `${heightPct}%`, minHeight: "22px" }}
                />
              </div>
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.05em]",
                  column.isNow ? "text-eb-text" : "text-eb-text/55",
                )}
              >
                {column.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Compact thousands label for the slim forecast bars ("146 k"). Falls back to a
 * plain localised integer when the values are too small for "k" to read well.
 */
function formatCompact(value: number, locale: string): string {
  if (value >= 10000) {
    return `${Math.round(value / 1000).toLocaleString(locale)} k`;
  }
  return Math.round(value).toLocaleString(locale);
}
