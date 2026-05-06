import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Lock,
  SkipForward,
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

export type PeriodControlStatus = "open" | "closed" | "skipped";

export type MonthArchiveViewModel = {
  triggerLabel: string;
  emptyLabel: string;
  statusLabels: MonthArchiveStatusLabels;
};

export type PeriodControlBarViewModel = {
  current: {
    yearMonth: string;
    label: string;
    status: PeriodControlStatus;
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
  };
  ribbonItems: PeriodStatusRibbonItem[];
  action: PeriodActionSlotViewModel;
  archive?: MonthArchiveViewModel;
};

type PeriodControlBarProps = {
  vm: PeriodControlBarViewModel;
  isSwitchingMonth?: boolean;
  onGoPrevious?: () => void;
  onGoNext?: () => void;
  onCloseMonth?: () => void;
  onContinueAction?: (yearMonth: string) => void;
  archiveMonths?: BudgetMonthListItemDto[];
  onSelectMonth?: (yearMonth: string) => void;
  archiveLocale?: string;
};

const navSegmentBase =
  "inline-flex h-10 min-w-0 items-center justify-center gap-2 px-3 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/30";

const navSegmentEnabled =
  "text-eb-text/70 hover:bg-white hover:text-eb-text active:scale-[0.98] active:bg-eb-shell/55";

const navSegmentDisabled =
  "disabled:cursor-not-allowed disabled:bg-[rgb(var(--eb-shell)/0.25)] disabled:text-eb-text/35 disabled:shadow-none disabled:hover:bg-[rgb(var(--eb-shell)/0.25)] disabled:hover:text-eb-text/35";

const statusToneClass: Record<PeriodRibbonTone, string> = {
  neutral: "border-eb-stroke/25 bg-eb-surface/85 text-eb-text/62",
  success: "border-emerald-200/70 bg-emerald-50/85 text-emerald-800",
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  muted: "border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.4)] text-eb-text/58",
};

function CurrentStatusIcon({ vm }: { vm: PeriodControlBarViewModel }) {
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

export default function PeriodControlBar({
  vm,
  isSwitchingMonth = false,
  onGoPrevious,
  onGoNext,
  onCloseMonth,
  onContinueAction,
  archiveMonths,
  onSelectMonth,
  archiveLocale,
}: PeriodControlBarProps) {
  const previousLabel = vm.previous?.label;
  const nextLabel = vm.next?.label;
  const previousAriaLabel = vm.previous?.ariaLabel ?? previousLabel ?? "Previous month";
  const nextAriaLabel = vm.next?.ariaLabel ?? nextLabel ?? "Next month";

  const showArchive =
    !!vm.archive && !!onSelectMonth && Array.isArray(archiveMonths);

  return (
    <section
      data-testid="stable-month-frame"
      aria-label="Period controls"
      className="rounded-[2rem] border border-[rgb(199_228_255_/_0.35)] bg-white/80 px-4 py-4 shadow-[0_18px_50px_rgb(21_39_81_/_0.06)] backdrop-blur sm:px-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div
            className={cn(
              "inline-flex min-w-0 overflow-hidden rounded-2xl border border-eb-stroke/30 bg-eb-surface/70 shadow-[0_10px_24px_rgb(21_39_81_/_0.05)]",
              isSwitchingMonth && "opacity-70",
            )}
          >
            <button
              type="button"
              data-testid="month-nav-previous"
              onClick={onGoPrevious}
              disabled={vm.previous?.disabled || isSwitchingMonth}
              className={cn(
                navSegmentBase,
                navSegmentEnabled,
                navSegmentDisabled,
                "rounded-l-2xl border-r border-eb-stroke/25",
              )}
              aria-label={previousAriaLabel}
              title={previousLabel}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="hidden max-w-[9rem] truncate sm:inline">
                {previousLabel}
              </span>
            </button>

            <div
              data-testid="active-month-label"
              className="inline-flex h-10 min-w-0 items-center justify-center gap-2 bg-white px-3 text-center text-sm font-extrabold text-eb-text sm:px-4"
              aria-live={isSwitchingMonth ? "polite" : undefined}
            >
              <span className="truncate">{vm.current.label}</span>
              {isSwitchingMonth ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-eb-text/55">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  <span className="sr-only">Loading period</span>
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

            <button
              type="button"
              data-testid="month-nav-next"
              onClick={onGoNext}
              disabled={vm.next?.disabled || isSwitchingMonth}
              className={cn(
                navSegmentBase,
                navSegmentEnabled,
                navSegmentDisabled,
                "rounded-r-2xl border-l border-eb-stroke/25",
              )}
              aria-label={nextAriaLabel}
              title={nextLabel}
            >
              <span className="hidden max-w-[9rem] truncate sm:inline">
                {nextLabel}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
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
