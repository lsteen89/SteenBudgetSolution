import { cn } from "@/lib/utils";

export type YearChapterStripProps = {
  /** Zero-based index of the just-closed (or about-to-close) month. */
  closedThrough: number;
  /**
   * Twelve `YYYY-MM` strings for the year being shown. Drives the
   * localized short month label per pill and the `title` tooltip.
   * Optional so the strip stays renderable when a caller has not yet
   * derived the list (e.g. tests).
   */
  yearMonthList?: readonly string[];
  /** App locale, used to format the short month label per pill. */
  locale: string;
  /**
   * When true, the just-closed pill (index = `closedThrough`) gets a
   * soft accent halo to read as the "current chapter". Defaults true.
   */
  highlight?: boolean;
  /** Pill diameter preset — sm for the review modal ribbon, md for the
   * larger handoff takeover card. */
  size?: "sm" | "md";
};

// Localized short month label, scoped to the strip so the modal and the
// takeover share the exact same fallback rules.
function shortMonthLabel(
  yearMonth: string | undefined,
  monthIndex: number,
  locale: string,
): string {
  const parsedYear = Number.parseInt(yearMonth?.slice(0, 4) ?? "", 10);
  const parsedMonth = Number.parseInt(yearMonth?.slice(5, 7) ?? "", 10);
  const year = Number.isFinite(parsedYear) ? parsedYear : 1970;
  const month =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth - 1
      : monthIndex;
  try {
    const date = new Date(Date.UTC(year, month, 15));
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return String(month + 1).padStart(2, "0");
  }
}

/**
 * Twelve-month progress strip — twelve dots plus localized short month
 * labels. Pills before and at `closedThrough` render filled in accent;
 * the just-closed pill optionally gets a soft halo when `highlight` is
 * truthy. Purely presentational; no state, no portals, no motion.
 */
export function YearChapterStrip({
  closedThrough,
  yearMonthList,
  locale,
  highlight = true,
  size = "md",
}: YearChapterStripProps) {
  const dotSize = size === "sm" ? 8 : 10;

  return (
    <div
      role="presentation"
      className="grid grid-cols-12 items-end gap-2"
      data-testid="close-month-year-strip"
    >
      {Array.from({ length: 12 }, (_, index) => {
        const yearMonth = yearMonthList?.[index];
        const label = shortMonthLabel(yearMonth, index, locale);
        const isClosed = index <= closedThrough;
        const isJustClosed = index === closedThrough;
        const tooltip = yearMonth ?? label;
        return (
          <div
            key={`${index}-${label}`}
            className="flex flex-col items-center gap-1.5"
            title={tooltip}
          >
            <span
              aria-hidden
              className={cn(
                "rounded-full transition-shadow duration-200 ease-out motion-reduce:transition-none",
                isClosed
                  ? "bg-eb-accent"
                  : "border border-eb-stroke/55 bg-eb-shell/55",
                isJustClosed && highlight
                  ? "shadow-[0_0_0_5px_rgb(var(--eb-accent)/0.18)]"
                  : null,
              )}
              style={{ width: dotSize, height: dotSize }}
            />
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.08em]",
                isClosed ? "text-eb-text/80" : "text-eb-text/45",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default YearChapterStrip;
