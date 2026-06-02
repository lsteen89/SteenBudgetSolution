import { useEffect, useRef } from "react";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import { debtProgressModalDict } from "@/utils/i18n/pages/private/debts/DebtProgressModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type DebtProgressModalProps = {
  open: boolean;
  row: DebtEditorRowDto | null;
  onClose: () => void;
};

const interpolate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

/**
 * Debt PR 9 — `Återbetalningsförlopp` view. Read-only; every figure is taken
 * straight from the PR 5 `DebtRowProgressDto` (typed `DebtBalanceEvent`
 * history). The page only opens this modal for rows where `progress` is
 * non-null, so a debt with no recorded balance events never shows a bar; the
 * no-history block here is a defensive fallback. Nothing is derived from
 * current-vs-original balance on the client — honesty gate from the brief.
 */
export default function DebtProgressModal({
  open,
  row,
  onClose,
}: DebtProgressModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtProgressModalDict.sv>(key: K) =>
    tDict(key, locale, debtProgressModalDict);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !row) return null;

  const progress = row.progress;
  const fmt0 = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        onClick={onClose}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="debt-progress-title"
          data-testid="debt-progress-modal"
          data-row-id={row.id}
          className={cn(
            "w-full max-w-[480px] rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface p-6",
            "shadow-[0_24px_60px_rgba(15,23,42,0.22)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.16em] text-eb-text/45">
                {t("eyebrow")}
              </p>
              <h2
                id="debt-progress-title"
                className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-eb-text"
              >
                {t("title")}
              </h2>
              <p className="mt-1 text-[13px] text-eb-text/60">
                {row.name} · {t("description")}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label={t("closeAriaLabel")}
              onClick={onClose}
              className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-eb-stroke/25 text-eb-text/60 transition hover:bg-[rgb(var(--eb-shell)/0.28)]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {progress ? (
            <ProgressBody progress={progress} fmt0={fmt0} t={t} locale={locale} />
          ) : (
            <div
              data-testid="debt-progress-empty"
              className="mt-6 rounded-2xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.14)] px-4 py-5 text-center"
            >
              <h3 className="m-0 text-[15px] font-semibold text-eb-text">
                {t("noHistoryHeading")}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-eb-text/60">
                {t("noHistoryBody")}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/30 px-4 text-sm font-medium text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.28)]"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBody({
  progress,
  fmt0,
  t,
  locale,
}: {
  progress: NonNullable<DebtEditorRowDto["progress"]>;
  fmt0: (value: number) => string;
  t: <K extends keyof typeof debtProgressModalDict.sv>(key: K) => string;
  locale: string;
}) {
  // `percentPaid` is null when the recorded first balance was 0 (the backend
  // guards the divide). Clamp 0–100 for the bar so a balance that grew (a
  // negative paid delta) never overflows the track.
  const percent = progress.percentPaid;
  const clamped =
    percent === null ? 0 : Math.max(0, Math.min(100, Math.round(percent)));

  // The backend explicitly allows a negative `totalPaidDelta` (the balance
  // grew — interest, a manual upward correction, etc.). Never render that as a
  // green "paid" figure: a reduction is shown neutrally, an increase is shown
  // in calm amber under an honest "balance increased" label. We never imply an
  // actual payment was made.
  const reduced = progress.totalPaidDelta >= 0;
  const deltaLabel = reduced ? t("reducedLabel") : t("increasedLabel");
  const deltaValue = fmt0(Math.abs(progress.totalPaidDelta));

  const eventsLabel = interpolate(
    progress.eventCount === 1 ? t("eventsOne") : t("eventsOther"),
    { count: progress.eventCount },
  );
  const dateRange = interpolate(t("dateRange"), {
    first: formatMonth(progress.firstEventAt, locale),
    last: formatMonth(progress.lastEventAt, locale),
  });

  return (
    <div className="mt-5" data-testid="debt-progress-body">
      <div className="flex items-baseline gap-2">
        {percent === null ? (
          <span className="text-[15px] font-semibold text-eb-text/70">
            {t("noPercentNote")}
          </span>
        ) : (
          <>
            <span
              data-testid="debt-progress-percent"
              className="text-[34px] font-extrabold leading-none tabular-nums text-eb-text"
            >
              {clamped}%
            </span>
            <span className="text-[13px] text-eb-text/60">
              {t("percentSuffix")}
            </span>
          </>
        )}
      </div>

      {percent !== null ? (
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[rgb(var(--eb-shell-3)/0.12)]">
          <div
            data-testid="debt-progress-fill"
            className="h-full rounded-full bg-[rgb(var(--eb-accent))]"
            style={{ width: `${clamped}%` }}
          />
        </div>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-eb-stroke/18 bg-[rgb(var(--eb-shell)/0.12)] px-4 py-3">
          <dt className="text-[12px] text-eb-text/55">{deltaLabel}</dt>
          <dd
            data-testid="debt-progress-delta"
            data-direction={reduced ? "reduced" : "increased"}
            className={cn(
              "m-0 mt-1 text-[16px] font-extrabold tabular-nums",
              reduced ? "text-eb-text" : "text-[#7c4a03]",
            )}
          >
            {deltaValue}
          </dd>
        </div>
        <div className="rounded-2xl border border-eb-stroke/18 bg-[rgb(var(--eb-shell)/0.12)] px-4 py-3">
          <dt className="text-[12px] text-eb-text/55">{t("remainingLabel")}</dt>
          <dd
            data-testid="debt-progress-remaining"
            className="m-0 mt-1 text-[16px] font-extrabold tabular-nums text-eb-text"
          >
            {fmt0(progress.currentBalance)}
          </dd>
          <p className="m-0 mt-0.5 text-[11.5px] text-eb-text/55">
            {interpolate(t("ofOriginalLabel"), {
              original: fmt0(progress.firstBalance),
            })}
          </p>
        </div>
      </dl>

      <p
        data-testid="debt-progress-events-note"
        className="mt-4 text-[12px] text-eb-text/55"
      >
        {eventsLabel} · {dateRange}
      </p>
    </div>
  );
}

/** Short `MMM yyyy` month label for the event date range. */
function formatMonth(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
  }).format(date);
}
