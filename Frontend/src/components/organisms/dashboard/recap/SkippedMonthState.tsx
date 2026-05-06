import type { AppLocale } from "@/types/i18n/appLocale";
import { skippedMonthStateDict } from "@/utils/i18n/pages/private/dashboard/recap/SkippedMonthState.i18n";
import { tDict } from "@/utils/i18n/translate";
import { SkipForward } from "lucide-react";

type SkippedMonthStateProps = {
  periodLabel: string;
  locale: AppLocale;
  nextPeriodLabel?: string | null;
};

export default function SkippedMonthState({
  periodLabel,
  locale,
  nextPeriodLabel,
}: SkippedMonthStateProps) {
  const t = (key: keyof typeof skippedMonthStateDict.sv) =>
    tDict(key, locale, skippedMonthStateDict);
  const nextStepText = nextPeriodLabel
    ? t("nextStepTemplate").replace("{month}", nextPeriodLabel)
    : null;
  const facts = [
    {
      label: t("snapshotLabel"),
      body: t("snapshotBody"),
    },
    {
      label: t("totalsLabel"),
      body: t("totalsBody"),
    },
    {
      label: t("comparisonLabel"),
      body: t("comparisonBody"),
    },
  ];

  return (
    <section
      data-testid="skipped-month-state"
      className="w-full rounded-[2rem] border border-[rgb(199_228_255_/_0.35)] bg-white/75 p-5 shadow-[0_18px_50px_rgb(21_39_81_/_0.06)] backdrop-blur sm:p-6"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.48fr)] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.4)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-eb-text/60">
              <SkipForward className="h-3.5 w-3.5" />
              {t("badge")}
            </span>
            <span className="text-sm font-semibold text-eb-text/55">
              {periodLabel}
            </span>
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-eb-text sm:text-2xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-eb-text/70">
            {t("body")}
          </p>
        </div>

        <div
          data-testid="skipped-month-facts"
          className="border-t border-[rgb(199_228_255_/_0.45)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
        >
          <div className="space-y-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <div className="text-sm font-bold text-eb-text">
                  {fact.label}
                </div>
                <div className="mt-0.5 text-xs font-medium leading-5 text-eb-text/60">
                  {fact.body}
                </div>
              </div>
            ))}
          </div>

          {nextStepText && (
            <div className="mt-4 border-t border-[rgb(199_228_255_/_0.35)] pt-3">
              <div className="text-[11px] font-semibold uppercase text-eb-text/40">
                {t("nextStepLabel")}
              </div>
              <div className="mt-1 text-sm font-bold text-eb-text/70">
                {nextStepText}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
