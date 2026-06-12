import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Lock,
  SkipForward,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BudgetMonthListItemDto } from "@/types/budget/BudgetMonthsStatusDto";

import MonthArchivePopover, {
  type MonthArchiveStatusLabels,
} from "./MonthArchivePopover";
import PeriodActionSlot, {
  type PeriodActionSlotViewModel,
} from "./PeriodActionSlot";
import PeriodStatusRibbon, {
  type PeriodRibbonTone,
  type PeriodStatusRibbonItem,
} from "./PeriodStatusRibbon";

export type MonthRailStatus = "open" | "closed" | "skipped";

export type MonthRailArchiveViewModel = {
  triggerLabel: string;
  emptyLabel: string;
  statusLabels: MonthArchiveStatusLabels;
};

/**
 * View-model for the dashboard MonthRail.
 *
 * Structural successor to the previous `PeriodControlBarViewModel`. The shape
 * is identical so the existing builder in `DashboardContent` keeps the same
 * wiring contract — MonthRail is a visual reskin, not a behaviour change.
 */
export type MonthRailViewModel = {
  /** Caller-provided, localized accessible name for the rail landmark. */
  ariaLabel: string;
  /** Caller-provided, localized screen-reader announcement during nav. */
  loadingLabel: string;
  current: {
    yearMonth: string;
    label: string;
    status: MonthRailStatus;
    statusLabel: string;
    tone: PeriodRibbonTone;
  };
  previous?: {
    label: string;
    disabled?: boolean;
    ariaLabel?: string;
  };
  next?: {
    label: string;
    disabled?: boolean;
    ariaLabel?: string;
    /**
     * How the Next button navigates. `"persisted"` (the default when omitted)
     * moves to the adjacent persisted month via `onGoNext`. `"preview"` means
     * there is no persisted next month yet but a read-only next-month preview
     * is available — `onGoNext` routes to `/dashboard/next-month`, and the
     * button shows a distinct affordance so it never reads as ordinary
     * persisted-month navigation.
     */
    mode?: "persisted" | "preview";
  };
  ribbonItems: PeriodStatusRibbonItem[];
  action: PeriodActionSlotViewModel;
  archive?: MonthRailArchiveViewModel;
};

type MonthRailProps = {
  vm: MonthRailViewModel;
  isSwitchingMonth?: boolean;
  onGoPrevious?: () => void;
  onGoNext?: () => void;
  onCloseMonth?: () => void;
  onContinueAction?: (yearMonth: string) => void;
  archiveMonths?: BudgetMonthListItemDto[];
  onSelectMonth?: (yearMonth: string) => void;
  archiveLocale?: string;
};

const navButtonBase =
  "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-eb-stroke/50 bg-eb-surface/70 text-eb-text/70 transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 hover:bg-white hover:text-eb-text hover:shadow-[0_8px_18px_rgb(21_39_81_/_0.06)] active:scale-[0.98]";

const navButtonDisabled =
  "disabled:cursor-not-allowed disabled:border-eb-stroke/15 disabled:bg-[rgb(var(--eb-shell)/0.25)] disabled:text-eb-text/35 disabled:shadow-none disabled:hover:bg-[rgb(var(--eb-shell)/0.25)] disabled:hover:text-eb-text/35";

const statusToneClass: Record<PeriodRibbonTone, string> = {
  neutral: "border-eb-stroke/25 bg-eb-surface/85 text-eb-text/62",
  success: "border-emerald-200/70 bg-emerald-50/85 text-emerald-800",
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  muted: "border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.4)] text-eb-text/58",
};

function CurrentStatusIcon({ vm }: { vm: MonthRailViewModel }) {
  const iconClass = "h-3.5 w-3.5";

  if (vm.current.status === "closed") return <Lock className={iconClass} />;
  if (vm.current.status === "skipped") {
    return <SkipForward className={cn(iconClass, "text-eb-text/55")} />;
  }

  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full",
        vm.current.tone === "attention" ? "bg-amber-500" : "bg-emerald-500",
      )}
    />
  );
}

/**
 * MonthRail — the calm horizon line at the top of the Spine dashboard.
 *
 * Anchors the user to "which month am I looking at, what state is it in, and
 * is it ready to close?" without competing with the MoneyState anchor below
 * it. Preserves all behaviour from the previous PeriodControlBar:
 *
 *  - prev / next month navigation (disabled bookkeeping from the view-model)
 *  - month archive popover (lazy-rendered children, same accessibility model)
 *  - open / closed / skipped status with calm tone treatment
 *  - close readiness driven by backend `isCloseWindowOpen`,
 *    `closeWindowOpensAtUtc`, `closeEligibleAtUtc`, `isOverdueForClose`
 *  - close CTA only when the open month is eligible — closed and skipped
 *    months never render edit affordances here
 *  - lifecycle ribbon items rendered underneath
 *
 * Visual evolution from the prior bar:
 *  - no card shell — the rail sits directly on the page gradient as a true
 *    horizon line so it never competes with the MoneyState surface below;
 *  - the period label is promoted to a true page anchor (`text-base sm:text-lg`
 *    extrabold) with the status pill inline;
 *  - prev / next are a compact pair of icon-only buttons (labels stay as
 *    title/aria-label) ahead of the period block;
 *  - preview-capable Next keeps the chevron as its primary icon and adds a
 *    small accent sparkle marker, so preview reads as "next, but special"
 *    rather than a different action;
 *  - the ribbon is kept but tightened so the rail does not bloat vertically.
 */
export default function MonthRail({
  vm,
  isSwitchingMonth = false,
  onGoPrevious,
  onGoNext,
  onCloseMonth,
  onContinueAction,
  archiveMonths,
  onSelectMonth,
  archiveLocale,
}: MonthRailProps) {
  const previousLabel = vm.previous?.label;
  const nextLabel = vm.next?.label;
  const previousAriaLabel =
    vm.previous?.ariaLabel ?? previousLabel ?? "Previous month";
  const nextAriaLabel = vm.next?.ariaLabel ?? nextLabel ?? "Next month";
  const isPreviewNext = vm.next?.mode === "preview";

  const showArchive =
    !!vm.archive && !!onSelectMonth && Array.isArray(archiveMonths);

  return (
    <section
      data-testid="month-rail"
      aria-label={vm.ariaLabel}
      className="relative z-20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              data-testid="month-nav-previous"
              onClick={onGoPrevious}
              disabled={vm.previous?.disabled || isSwitchingMonth}
              className={cn(navButtonBase, navButtonDisabled)}
              aria-label={previousAriaLabel}
              title={previousLabel}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              data-testid="month-nav-next"
              data-next-mode={vm.next?.mode ?? "persisted"}
              onClick={onGoNext}
              disabled={vm.next?.disabled || isSwitchingMonth}
              className={cn(
                navButtonBase,
                navButtonDisabled,
                isPreviewNext &&
                  "border-eb-accent/40 bg-eb-accentSoft/80 text-emerald-800 hover:bg-eb-accentSoft hover:text-emerald-800",
              )}
              aria-label={nextAriaLabel}
              title={nextLabel}
            >
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              {isPreviewNext ? (
                <span
                  data-testid="month-nav-next-preview-marker"
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-eb-accent text-white"
                >
                  <Sparkles className="h-2 w-2" />
                </span>
              ) : null}
            </button>
          </div>

          <div
            data-testid="active-month-label"
            data-active="true"
            className={cn(
              "relative inline-flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 sm:flex-none sm:gap-3",
              isSwitchingMonth && "opacity-70",
            )}
            aria-live={isSwitchingMonth ? "polite" : undefined}
          >
            <span className="truncate text-base font-extrabold text-eb-text sm:text-lg">
              {vm.current.label}
            </span>
            {isSwitchingMonth ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-eb-text/55">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span className="sr-only">{vm.loadingLabel}</span>
              </span>
            ) : (
              <span
                data-testid="month-status-badge"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                  statusToneClass[vm.current.tone],
                )}
              >
                <CurrentStatusIcon vm={vm} />
                {vm.current.statusLabel}
              </span>
            )}
          </div>

          {showArchive ? (
            <MonthArchivePopover
              months={archiveMonths!}
              currentYearMonth={vm.current.yearMonth}
              triggerLabel={vm.archive!.triggerLabel}
              emptyLabel={vm.archive!.emptyLabel}
              statusLabels={vm.archive!.statusLabels}
              locale={archiveLocale ?? "sv-SE"}
              onSelectMonth={onSelectMonth!}
              disabled={isSwitchingMonth}
            />
          ) : null}
        </div>

        <PeriodActionSlot
          action={vm.action}
          isSwitchingMonth={isSwitchingMonth}
          onCloseMonth={onCloseMonth}
          onContinueAction={onContinueAction}
        />
      </div>

      <PeriodStatusRibbon items={vm.ribbonItems} />
    </section>
  );
}
