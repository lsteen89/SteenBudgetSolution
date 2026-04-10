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

import { SecondaryButton } from "@/components/atoms/buttons/SecondaryButton";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import type {
  BudgetPeriodStatus,
  HeaderLifecycleState,
} from "@/hooks/dashboard/dashboardSummary.types";

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

  canAdvancePeriod: boolean;
  advanceButtonLabel?: string | null;
  onAdvancePeriod?: () => void;

  onOpenPeriodEditor: () => void;
};

function StatusBadge({
  status,
  openLabel,
  closedLabel,
  skippedLabel,
}: {
  status: BudgetPeriodStatus;
  openLabel: string;
  closedLabel: string;
  skippedLabel: string;
}) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {openLabel}
      </span>
    );
  }

  if (status === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-eb-stroke/30 bg-eb-text/5 px-2.5 py-1 text-xs font-semibold text-eb-text/65">
        <Lock className="h-3.5 w-3.5" />
        {closedLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.55)] px-2.5 py-1 text-xs font-semibold text-eb-text/70">
      <SkipForward className="h-3.5 w-3.5" />
      {skippedLabel}
    </span>
  );
}

function LifecycleNotice({
  lifecycleState,
  noticeText,
}: {
  lifecycleState: HeaderLifecycleState;
  noticeText?: string | null;
}) {
  if (!noticeText) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        lifecycleState === "upcoming" &&
          "border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.45)] text-eb-text/75",
        lifecycleState === "eligible" &&
          "border-emerald-500/25 bg-emerald-500/10 text-eb-text/85",
        lifecycleState === "overdue" &&
          "border-red-400/25 bg-red-500/10 text-eb-text/90",
      )}
    >
      {noticeText}
    </div>
  );
}

const navButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-eb-stroke/25 bg-eb-surface/80 px-3 text-sm font-medium text-eb-text/75 transition-[transform,background-color,opacity,box-shadow] duration-150 hover:bg-eb-surface active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:pointer-events-none disabled:opacity-40";

function getHeaderTitle(
  periodLabel: string,
  periodStatus: BudgetPeriodStatus,
  remainingToSpend: number,
  canAdvancePeriod: boolean,
  t: <K extends keyof typeof dashboardHeaderDict.sv>(key: K) => string,
) {
  if (periodStatus === "closed") return periodLabel;
  if (canAdvancePeriod) return t("titleReady");
  if (remainingToSpend < 0) return t("titleNegative");
  if (remainingToSpend > 0) return t("titlePositive");
  return periodLabel;
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
  canAdvancePeriod,
  advanceButtonLabel,
  onAdvancePeriod,
  onOpenPeriodEditor,
}) => {
  const locale = useAppLocale();
  const appCurrency = useAppCurrency();

  const t = <K extends keyof typeof dashboardHeaderDict.sv>(key: K) =>
    tDict(key, locale, dashboardHeaderDict);

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

  const showAdvanceCta =
    periodStatus === "open" &&
    canAdvancePeriod &&
    !!advanceButtonLabel &&
    !!onAdvancePeriod;

  const title = getHeaderTitle(
    periodLabel,
    periodStatus,
    remainingToSpend,
    canAdvancePeriod,
    t,
  );

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
          {showAdvanceCta && (
            <button
              type="button"
              onClick={onAdvancePeriod}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-2xl px-5 font-semibold text-white shadow-sm transition",
                lifecycleState === "overdue"
                  ? "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500/25"
                  : "bg-eb-accent hover:opacity-90 focus-visible:ring-eb-accent/25",
                "focus-visible:outline-none focus-visible:ring-4",
              )}
            >
              {advanceButtonLabel}
            </button>
          )}

          {periodStatus === "open" ? (
            <SecondaryButton
              onClick={onOpenPeriodEditor}
              className="h-11 rounded-2xl px-5"
            >
              {t("editThisPeriod")}
            </SecondaryButton>
          ) : (
            <div className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-5 text-sm font-medium text-eb-text/60">
              <Lock className="mr-2 h-4 w-4" />
              {t("closedReadOnly")}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl bg-[rgb(var(--eb-shell)/0.28)] p-1.5">
            <button
              type="button"
              onClick={onGoPrevious}
              disabled={!canGoPrevious || isSwitchingMonth}
              className={navButtonClass}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {previousPeriodLabel ?? t("previous")}
              </span>
            </button>

            <div
              className={cn(
                "flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-eb-stroke/25 bg-eb-surface/90 px-3 py-2",
                isSwitchingMonth && "opacity-70",
              )}
            >
              <span className="text-sm font-bold text-eb-text">
                {periodLabel}
              </span>
              {isSwitchingMonth && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.42)] px-2 py-1 text-xs font-medium text-eb-text/55">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  {t("loadingPeriod")}
                </span>
              )}
              <StatusBadge
                status={periodStatus}
                openLabel={t("open")}
                closedLabel={t("closed")}
                skippedLabel={t("skipped")}
              />
            </div>

            {canGoNext ? (
              <button
                type="button"
                onClick={onGoNext}
                disabled={isSwitchingMonth}
                className={navButtonClass}
                aria-label={nextPeriodLabel ?? t("next")}
              >
                <span className="hidden sm:inline">
                  {nextPeriodLabel ?? t("next")}
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : isSwitchingMonth ? (
              <button
                type="button"
                disabled
                className={cn(
                  navButtonClass,
                  "border-eb-stroke/30 bg-eb-surface/75 text-eb-text/45 cursor-wait opacity-100",
                )}
                aria-label={t("next")}
              >
                <span className="hidden sm:inline">
                  {nextPeriodLabel ?? t("next")}
                </span>
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
                        "border-eb-stroke/30 bg-eb-surface/75 text-eb-text/45",
                        "shadow-[0_1px_0_rgba(255,255,255,0.35)]",
                        "cursor-not-allowed opacity-100",
                        "hover:bg-eb-surface/75",
                        "relative",
                      )}
                    >
                      <span className="hidden sm:inline">
                        {nextPeriodLabel ?? t("next")}
                      </span>
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
          </div>

          <div className="xl:pl-5 xl:border-l xl:border-eb-stroke/25 flex items-center">
            <div className="text-sm font-medium text-eb-text/60">
              {periodDateRangeLabel}
            </div>
          </div>
        </div>

        {noticeText && (
          <div className="mt-3">
            <LifecycleNotice
              lifecycleState={lifecycleState}
              noticeText={noticeText}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturningHeader;
