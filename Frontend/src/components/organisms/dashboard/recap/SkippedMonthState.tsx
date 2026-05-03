import type { AppLocale } from "@/types/i18n/appLocale";
import { skippedMonthStateDict } from "@/utils/i18n/pages/private/dashboard/recap/SkippedMonthState.i18n";
import { tDict } from "@/utils/i18n/translate";
import { ChevronLeft, ChevronRight } from "lucide-react";

type SkippedMonthStateProps = {
  periodLabel: string;
  locale: AppLocale;
  previousPeriodLabel?: string | null;
  nextPeriodLabel?: string | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onGoPrevious?: () => void;
  onGoNext?: () => void;
  isSwitchingMonth?: boolean;
};

export default function SkippedMonthState({
  periodLabel,
  locale,
  previousPeriodLabel,
  nextPeriodLabel,
  canGoPrevious,
  canGoNext,
  onGoPrevious,
  onGoNext,
  isSwitchingMonth = false,
}: SkippedMonthStateProps) {
  const buttonClass =
    "inline-flex h-10 items-center gap-2 rounded-full border border-eb-stroke/40 bg-eb-surface/85 px-3 text-sm font-semibold text-eb-text shadow-sm transition hover:bg-eb-surface disabled:cursor-not-allowed disabled:opacity-45";
  const t = (key: keyof typeof skippedMonthStateDict.sv) =>
    tDict(key, locale, skippedMonthStateDict);

  return (
    <section
      data-testid="skipped-month-state"
      className="w-full max-w-6xl space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="month-nav-previous"
          className={buttonClass}
          disabled={!canGoPrevious || isSwitchingMonth}
          onClick={onGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{previousPeriodLabel ?? t("previous")}</span>
        </button>

        <button
          type="button"
          data-testid="month-nav-next"
          className={buttonClass}
          disabled={!canGoNext || isSwitchingMonth}
          onClick={onGoNext}
        >
          <span>{nextPeriodLabel ?? t("next")}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="month-status-badge"
            className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200"
          >
            {t("badge")}
          </span>
          <span
            data-testid="active-month-label"
            className="text-lg font-extrabold text-eb-text"
          >
            {periodLabel}
          </span>
        </div>

        <h1 className="mt-4 text-xl font-extrabold text-eb-text">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-eb-text/70">
          {t("body")}
        </p>
      </div>
    </section>
  );
}
