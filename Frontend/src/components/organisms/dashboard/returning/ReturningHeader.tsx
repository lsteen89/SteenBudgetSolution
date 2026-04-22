import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Lock,
  SkipForward,
  Sparkles,
} from "lucide-react";
import React from "react";

import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import type {
  BudgetPeriodStatus,
  HeaderLifecycleState,
} from "@/hooks/dashboard/dashboardSummary.types";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import styles from "./ReturningHeader.module.css";

type HeaderTKey = keyof typeof dashboardHeaderDict.sv;
type HeaderT = <K extends HeaderTKey>(key: K) => string;

type ReturningHeaderStatusTone = "open" | "overdue" | "closed" | "skipped";
type ReturningHeaderPrimaryAction = "close" | "next" | "lockedNext";
type ReturningHeaderMicrocopyKey =
  | "readyToFinalize"
  | "actionRequired"
  | "closingOpensSoon";

type ReturningHeaderViewModel = {
  statusTone: ReturningHeaderStatusTone;
  statusLabelKey: "open" | "overdue" | "closed" | "skipped";
  primaryAction: ReturningHeaderPrimaryAction;
  showCloseSheen: boolean;
  microcopyKey?: ReturningHeaderMicrocopyKey;
  microcopyText?: string | null;
  showPreviewNextMonth: boolean;
};

function buildReturningHeaderViewModel({
  periodStatus,
  lifecycleState,
  canGoNext,
  canCloseMonth,
  closeMonthButtonLabel,
  noticeText,
  canPreviewNextMonth = false,
}: {
  periodStatus: BudgetPeriodStatus;
  lifecycleState: HeaderLifecycleState;
  canGoNext: boolean;
  canCloseMonth: boolean;
  closeMonthButtonLabel?: string | null;
  noticeText?: string | null;
  canPreviewNextMonth?: boolean;
}): ReturningHeaderViewModel {
  const showCloseAction =
    periodStatus === "open" && canCloseMonth && !!closeMonthButtonLabel;

  const statusTone: ReturningHeaderStatusTone =
    periodStatus === "closed"
      ? "closed"
      : periodStatus === "skipped"
        ? "skipped"
        : lifecycleState === "overdue"
          ? "overdue"
          : "open";

  const primaryAction: ReturningHeaderPrimaryAction = showCloseAction
    ? "close"
    : canGoNext
      ? "next"
      : "lockedNext";

  const microcopyKey = showCloseAction
    ? lifecycleState === "overdue"
      ? "actionRequired"
      : lifecycleState === "eligible"
        ? "readyToFinalize"
        : undefined
    : lifecycleState === "upcoming"
      ? "closingOpensSoon"
      : undefined;

  return {
    statusTone,
    statusLabelKey: statusTone,
    primaryAction,
    showCloseSheen: showCloseAction && lifecycleState === "overdue",
    microcopyKey,
    microcopyText: noticeText ?? null,
    showPreviewNextMonth: showCloseAction && canPreviewNextMonth,
  };
}

export type ReturningHeaderProps = {
  periodLabel: string;
  periodDateRangeLabel: string;
  periodStatus: BudgetPeriodStatus;

  previousPeriodLabel?: string | null;
  nextPeriodLabel?: string | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onGoPrevious?: () => void;
  onGoNext?: () => void;
  isSwitchingMonth?: boolean;

  remainingToSpend: number;
  currency?: CurrencyCode;

  lifecycleState: HeaderLifecycleState;
  noticeText?: string | null;

  canCloseMonth: boolean;
  closeMonthButtonLabel?: string | null;
  onCloseMonth?: () => void;

  canPreviewNextMonth?: boolean;
  onPreviewNextMonth?: () => void;
  previewNextMonthLabel?: string | null;
};

const navButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-eb-stroke/25 bg-eb-surface/80 px-3 text-sm font-medium text-eb-text/75 transition-[transform,background-color,opacity,box-shadow] duration-150 hover:bg-eb-surface active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:pointer-events-none disabled:opacity-40";

function getHeaderTitle(
  periodLabel: string,
  periodStatus: BudgetPeriodStatus,
  remainingToSpend: number,
  t: HeaderT,
) {
  if (periodStatus === "closed") return periodLabel;
  if (remainingToSpend < 0) return t("titleNegative");
  if (remainingToSpend > 0) return t("titlePositive");
  return periodLabel;
}

function InlinePeriodState({
  tone,
  label,
}: {
  tone: "open" | "overdue" | "closed" | "skipped";
  label: string;
}) {
  if (tone === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-eb-text/55">
        <Lock className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }

  if (tone === "skipped") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-eb-text/55">
        <SkipForward className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold",
        tone === "overdue" ? "text-amber-700" : "text-emerald-700",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          tone === "overdue" ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      {label}
    </span>
  );
}

function HeaderMetaPill({
  periodStatus,
  displayedPeriodRangeLabel,
  t,
}: {
  periodStatus: BudgetPeriodStatus;
  displayedPeriodRangeLabel: string;
  t: HeaderT;
}) {
  if (periodStatus === "open") {
    return (
      <div className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-5 text-sm font-medium text-eb-text/60">
        {displayedPeriodRangeLabel}
      </div>
    );
  }

  return (
    <div className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-5 text-sm font-medium text-eb-text/60">
      <Lock className="mr-2 h-4 w-4" />
      {t("closedReadOnly")}
    </div>
  );
}

function HeaderActionSlot({
  vm,
  nextPeriodLabel,
  onGoNext,
  isSwitchingMonth,
  closeMonthButtonLabel,
  onCloseMonth,
  onPreviewNextMonth,
  previewNextMonthLabel,
  t,
}: {
  vm: ReturningHeaderViewModel;
  nextPeriodLabel?: string | null;
  onGoNext?: () => void;
  isSwitchingMonth: boolean;
  closeMonthButtonLabel?: string | null;
  onCloseMonth?: () => void;
  onPreviewNextMonth?: () => void;
  previewNextMonthLabel?: string | null;
  t: HeaderT;
}) {
  const microcopy =
    vm.microcopyText ?? (vm.microcopyKey ? t(vm.microcopyKey) : null);

  return (
    <div className="flex min-w-[180px] flex-col items-start xl:items-end">
      {vm.primaryAction === "close" ? (
        <CtaButton
          onClick={onCloseMonth}
          disabled={isSwitchingMonth || !onCloseMonth}
          className={cn(
            "min-w-[180px]",
            vm.showCloseSheen && styles.closeCtaSheen,
            isSwitchingMonth && "cursor-wait opacity-70",
          )}
        >
          <span className="relative z-10">{closeMonthButtonLabel}</span>
        </CtaButton>
      ) : vm.primaryAction === "next" ? (
        <button
          type="button"
          onClick={onGoNext}
          disabled={isSwitchingMonth || !onGoNext}
          className={cn(navButtonClass, "h-11 min-w-[180px] justify-center")}
          aria-label={nextPeriodLabel ?? t("next")}
        >
          <span>{nextPeriodLabel ?? t("next")}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex">
              <button
                type="button"
                disabled
                aria-label={t("nextLockedHint")}
                className={cn(
                  navButtonClass,
                  "h-11 min-w-[180px] justify-center border-eb-stroke/30 bg-eb-surface/75 text-eb-text/45 opacity-100",
                )}
              >
                <span>{nextPeriodLabel ?? t("next")}</span>
                <span className="inline-flex items-center justify-center rounded-full border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.45)] p-1">
                  <Lock className="h-3.5 w-3.5 opacity-80" />
                </span>
              </button>
            </span>
          </TooltipTrigger>

          <TooltipContent className="max-w-[260px] text-sm">
            {t("nextLockedHint")}
          </TooltipContent>
        </Tooltip>
      )}

      {microcopy && (
        <div
          className={cn(
            "mt-1 px-1 text-xs",
            vm.statusTone === "overdue" ? "text-amber-700" : "text-eb-text/45",
          )}
        >
          {microcopy}
        </div>
      )}

      {vm.showPreviewNextMonth && onPreviewNextMonth && (
        <button
          type="button"
          onClick={onPreviewNextMonth}
          className="mt-1 rounded-md px-1 text-xs font-medium text-eb-text/55 transition-colors hover:text-eb-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/25"
        >
          {previewNextMonthLabel ?? t("previewNextMonth")}
        </button>
      )}
    </div>
  );
}

function PeriodNavigator({
  periodLabel,
  periodStatus,
  previousPeriodLabel,
  nextPeriodLabel,
  canGoPrevious,
  canGoNext,
  onGoPrevious,
  onGoNext,
  isSwitchingMonth,
  lifecycleState,
  noticeText,
  canCloseMonth,
  closeMonthButtonLabel,
  onCloseMonth,
  canPreviewNextMonth,
  onPreviewNextMonth,
  previewNextMonthLabel,
  t,
}: {
  periodLabel: string;
  periodStatus: BudgetPeriodStatus;
  previousPeriodLabel?: string | null;
  nextPeriodLabel?: string | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onGoPrevious?: () => void;
  onGoNext?: () => void;
  isSwitchingMonth: boolean;
  lifecycleState: HeaderLifecycleState;
  noticeText?: string | null;
  canCloseMonth: boolean;
  closeMonthButtonLabel?: string | null;
  onCloseMonth?: () => void;
  canPreviewNextMonth?: boolean;
  onPreviewNextMonth?: () => void;
  previewNextMonthLabel?: string | null;
  t: HeaderT;
}) {
  const headerVm = buildReturningHeaderViewModel({
    periodStatus,
    lifecycleState,
    canGoNext,
    canCloseMonth,
    closeMonthButtonLabel,
    noticeText,
    canPreviewNextMonth,
  });

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-start">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onGoPrevious}
          disabled={!canGoPrevious || isSwitchingMonth}
          className={cn(navButtonClass, "h-11")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">
            {previousPeriodLabel ?? t("previous")}
          </span>
        </button>
      </div>

      <div className="flex justify-center">
        <div
          className={cn(
            "flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-eb-stroke/25 bg-eb-surface/90 px-4 py-2.5 text-center",
            isSwitchingMonth && "opacity-70",
          )}
        >
          <span className="text-sm font-bold text-eb-text">{periodLabel}</span>

          {isSwitchingMonth ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-eb-text/55">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              {t("loadingPeriod")}
            </span>
          ) : (
            <InlinePeriodState
              tone={headerVm.statusTone}
              label={t(headerVm.statusLabelKey)}
            />
          )}
        </div>
      </div>

      <div className="flex justify-start xl:justify-end">
        <HeaderActionSlot
          vm={headerVm}
          nextPeriodLabel={nextPeriodLabel}
          onGoNext={onGoNext}
          isSwitchingMonth={isSwitchingMonth}
          closeMonthButtonLabel={closeMonthButtonLabel}
          onCloseMonth={onCloseMonth}
          onPreviewNextMonth={onPreviewNextMonth}
          previewNextMonthLabel={previewNextMonthLabel}
          t={t}
        />
      </div>
    </div>
  );
}

const ReturningHeader: React.FC<ReturningHeaderProps> = ({
  periodLabel,
  periodDateRangeLabel,
  periodStatus,
  previousPeriodLabel,
  nextPeriodLabel,
  canGoPrevious = false,
  canGoNext = false,
  onGoPrevious,
  onGoNext,
  isSwitchingMonth = false,
  remainingToSpend,
  currency,
  lifecycleState,
  noticeText,
  canCloseMonth,
  closeMonthButtonLabel,
  onCloseMonth,
  canPreviewNextMonth = false,
  onPreviewNextMonth,
  previewNextMonthLabel,
}) => {
  const locale = useAppLocale();
  const appCurrency = useAppCurrency();

  const displayedPeriodRangeLabel = periodDateRangeLabel || periodLabel;

  const t: HeaderT = (key) => tDict(key, locale, dashboardHeaderDict);

  const effectiveCurrency = currency ?? appCurrency;

  const remainingLabel = formatMoneyV2(
    remainingToSpend,
    effectiveCurrency,
    locale,
  );

  const negativeRemainingLabel = formatMoneyV2(
    Math.abs(remainingToSpend),
    effectiveCurrency,
    locale,
  );

  const remainingToneClass =
    remainingToSpend < 0 ? "text-red-500" : "text-eb-text";

  const title = getHeaderTitle(periodLabel, periodStatus, remainingToSpend, t);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-eb-text/70">
            <Sparkles className="h-4 w-4 text-eb-accent" />
            {t("topHint")}
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-eb-text sm:text-3xl">
            {title}
          </h1>

          <div className="mt-2 inline-flex items-center rounded-full border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] px-3 py-1 text-xs font-semibold text-eb-text/65 sm:text-sm">
            {displayedPeriodRangeLabel}
          </div>

          <p className="mt-2 text-sm text-eb-text/65 sm:text-base">
            {remainingToSpend < 0 ? (
              <>
                {t("remainingNegativePrefix")}{" "}
                <span
                  className={cn(
                    "font-extrabold tracking-tight",
                    remainingToneClass,
                  )}
                >
                  {negativeRemainingLabel}
                </span>{" "}
                {t("remainingNegativeSuffix")}
              </>
            ) : (
              <>
                {t("remainingPrefix")}{" "}
                <span
                  className={cn(
                    "font-extrabold tracking-tight",
                    remainingToneClass,
                  )}
                >
                  {remainingLabel}
                </span>{" "}
                {t("remainingSuffix")}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <HeaderMetaPill
            periodStatus={periodStatus}
            displayedPeriodRangeLabel={displayedPeriodRangeLabel}
            t={t}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] p-4 sm:p-5">
        <PeriodNavigator
          periodLabel={periodLabel}
          periodStatus={periodStatus}
          previousPeriodLabel={previousPeriodLabel}
          nextPeriodLabel={nextPeriodLabel}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onGoPrevious={onGoPrevious}
          onGoNext={onGoNext}
          isSwitchingMonth={isSwitchingMonth}
          lifecycleState={lifecycleState}
          noticeText={noticeText}
          canCloseMonth={canCloseMonth}
          closeMonthButtonLabel={closeMonthButtonLabel}
          onCloseMonth={onCloseMonth}
          canPreviewNextMonth={canPreviewNextMonth}
          onPreviewNextMonth={onPreviewNextMonth}
          previewNextMonthLabel={previewNextMonthLabel}
          t={t}
        />
      </div>
    </div>
  );
};

export default ReturningHeader;
