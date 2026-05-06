import { Archive, Check, Lock, SkipForward } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import type { BudgetMonthListItemDto } from "@/types/budget/BudgetMonthsStatusDto";

export type MonthArchiveStatusLabels = {
  open: string;
  closed: string;
  skipped: string;
};

type StatusTone = "open" | "closed" | "skipped";

const statusToneClass: Record<StatusTone, string> = {
  open: "border-emerald-200/70 bg-emerald-50/75 text-emerald-800",
  closed: "border-eb-stroke/25 bg-white/85 text-eb-text/65",
  skipped: "border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.4)] text-eb-text/55",
};

function formatYearLabel(year: number, locale: string): string {
  return new Date(year, 0, 1).toLocaleDateString(locale, { year: "numeric" });
}

function formatMonthLabel(yearMonth: string, locale: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return yearMonth;
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
  });
}

function groupByYearDescending(months: BudgetMonthListItemDto[]) {
  const sorted = [...months].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  const groups = new Map<number, BudgetMonthListItemDto[]>();
  for (const month of sorted) {
    const year = Number(month.yearMonth.split("-")[0]);
    if (!Number.isFinite(year)) continue;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(month);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
}

type MonthArchivePopoverProps = {
  months: BudgetMonthListItemDto[];
  currentYearMonth: string;
  triggerLabel: string;
  emptyLabel: string;
  statusLabels: MonthArchiveStatusLabels;
  locale: string;
  onSelectMonth: (yearMonth: string) => void;
  disabled?: boolean;
};

export default function MonthArchivePopover({
  months,
  currentYearMonth,
  triggerLabel,
  emptyLabel,
  statusLabels,
  locale,
  onSelectMonth,
  disabled = false,
}: MonthArchivePopoverProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    // Move focus to the currently selected month so keyboard users land on context.
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      "[data-archive-current='true']",
    );
    el?.focus();
  }, [open]);

  const groups = React.useMemo(() => groupByYearDescending(months), [months]);
  const hasMonths = groups.length > 0;

  const handleSelect = (yearMonth: string) => {
    onSelectMonth(yearMonth);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-testid="month-archive-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-3 text-sm font-semibold text-eb-text/72 shadow-[0_8px_18px_rgb(21_39_81_/_0.04)] transition-[background-color,color,box-shadow,transform] duration-150",
          "hover:bg-white hover:text-eb-text hover:shadow-[0_10px_22px_rgb(21_39_81_/_0.08)]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25",
          "disabled:cursor-not-allowed disabled:bg-[rgb(var(--eb-shell)/0.25)] disabled:text-eb-text/35 disabled:shadow-none",
          open && "bg-white text-eb-text shadow-[0_10px_22px_rgb(21_39_81_/_0.08)]",
        )}
      >
        <Archive className="h-4 w-4 shrink-0 text-eb-text/55" aria-hidden="true" />
        <span className="hidden sm:inline">{triggerLabel}</span>
        <span aria-hidden="true" className="text-eb-text/40">
          ▾
        </span>
      </button>

      {open ? (
        <div
          ref={listRef}
          role="menu"
          data-testid="month-archive-popover"
          aria-label={triggerLabel}
          className={cn(
            "absolute right-0 z-30 mt-2 w-[280px] overflow-hidden rounded-2xl border border-eb-stroke/30 bg-eb-surface/95 shadow-[0_24px_60px_rgb(21_39_81_/_0.18)] backdrop-blur-md sm:w-[320px]",
          )}
        >
          {hasMonths ? (
            <div className="max-h-[360px] overflow-y-auto py-1">
              {groups.map(([year, items]) => (
                <div key={year} className="px-1 py-1">
                  <div
                    className="px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-eb-text/45"
                    aria-hidden="true"
                  >
                    {formatYearLabel(year, locale)}
                  </div>
                  <ul className="px-1">
                    {items.map((month) => {
                      const isCurrent = month.yearMonth === currentYearMonth;
                      const tone: StatusTone = month.status;
                      return (
                        <li key={month.yearMonth}>
                          <button
                            type="button"
                            role="menuitem"
                            data-testid={`month-archive-option-${month.yearMonth}`}
                            data-archive-current={isCurrent ? "true" : "false"}
                            aria-current={isCurrent ? "true" : undefined}
                            onClick={() => handleSelect(month.yearMonth)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-eb-text/80 transition-colors",
                              "hover:bg-eb-surfaceAccent/55 hover:text-eb-text",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/40",
                              isCurrent && "bg-eb-accentSoft/35 text-eb-text",
                            )}
                          >
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <span className="truncate capitalize">
                                {formatMonthLabel(month.yearMonth, locale)}
                              </span>
                              {isCurrent ? (
                                <Check className="h-3.5 w-3.5 text-eb-accent" aria-hidden="true" />
                              ) : null}
                            </span>
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                                statusToneClass[tone],
                              )}
                            >
                              {tone === "closed" ? (
                                <Lock className="h-3 w-3" aria-hidden="true" />
                              ) : tone === "skipped" ? (
                                <SkipForward className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                                />
                              )}
                              <span>{statusLabels[tone]}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm font-medium text-eb-text/60">
              {emptyLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
