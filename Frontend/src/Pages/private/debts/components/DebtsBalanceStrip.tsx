import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type {
  DebtEditorRowDto,
  DebtEditorSummaryDto,
} from "@/types/budget/DebtEditorDto";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { ArrowRight, Info } from "lucide-react";
import {
  DEBT_TYPE_BUCKET_ORDER,
  debtTypeSplitTotal,
  splitDebtRowsBy,
  type DebtTypeBucket,
} from "../utils/debtTypeSplit";

type DebtsBalanceStripProps = {
  summary: DebtEditorSummaryDto;
  /**
   * Active-group rows (`group === "active"`). Used to derive the per-type
   * split for the meter. Keeping this scoped to active rows means the meter
   * matches `summary.includedMonthlyPaymentTotal` to the cent.
   */
  activeRows: readonly DebtEditorRowDto[];
  /** Real `Kvar efter inkomst, utgifter, sparande & skulder` from the dashboard. */
  freeAfterDebts: number | null;
};

const TYPE_DOT_CLASS: Record<DebtTypeBucket, string> = {
  loan: "bg-[rgb(var(--eb-shell-3)/0.92)]",
  credit: "bg-[rgb(var(--eb-shell-2))]",
  installment: "bg-[rgb(var(--eb-stroke-strong))]",
};

export default function DebtsBalanceStrip({
  summary,
  activeRows,
  freeAfterDebts,
}: DebtsBalanceStripProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, debtsEditorPageDict);

  const monthlyPayments = summary.includedMonthlyPaymentTotal;
  const owedBalance = summary.activeLiabilityBalanceTotal;
  const split = splitDebtRowsBy(activeRows, (row) => row.monthlyPayment);
  const splitTotal = debtTypeSplitTotal(split);
  const showMeter = splitTotal > 0;

  const fmt0 = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  return (
    <section
      data-testid="debts-balance-strip"
      aria-label={t("stripSectionLabel")}
      className={cn(
        "rounded-[1.4rem] border border-eb-stroke/30 bg-eb-surface/85",
        "px-4 py-3 sm:px-5 sm:py-4",
        "shadow-[0_1px_2px_rgba(21,39,81,0.04)]",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-eb-text/50">
            {t("stripSectionLabel")}
          </span>
          <div
            data-testid="debts-strip-headline"
            className="mt-1 text-[17px] font-extrabold tabular-nums text-eb-text"
          >
            {t("stripHeadline").replace("{amount}", fmt0(monthlyPayments))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[13px] text-eb-text/65">{t("stripMessage")}</p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:gap-4">
        <div
          data-testid="debts-strip-zone-flow"
          className="rounded-2xl border border-eb-stroke/45 bg-eb-surface/55 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-eb-text/55">
            <ArrowRight className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
            {t("stripZoneFlowLabel")}
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-7 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[12px] text-eb-text/55">
                {t("stripPaymentsLabel")}
              </dt>
              <dd
                data-testid="debts-strip-payments-value"
                className="m-0 text-base font-extrabold tabular-nums text-eb-shell-3"
              >
                −{fmt0(monthlyPayments)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[12px] text-eb-text/55">
                {t("stripFreeAfterLabel")}
              </dt>
              <dd
                data-testid="debts-strip-free-value"
                className={cn(
                  "m-0 text-base font-extrabold tabular-nums",
                  freeAfterDebts !== null && freeAfterDebts < 0
                    ? "text-[#7c4a03]"
                    : "text-[#166534]",
                )}
              >
                {freeAfterDebts !== null ? fmt0(freeAfterDebts) : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div
          data-testid="debts-strip-zone-snapshot"
          className="rounded-2xl border border-eb-shell-3/16 bg-[rgb(var(--eb-shell-3)/0.045)] px-4 py-3"
        >
          <div className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-eb-text/55">
            <Info className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
            {t("stripZoneSnapshotLabel")}
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-7 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[12px] text-eb-text/55">
                {t("stripBalanceLabel")}
              </dt>
              <dd
                data-testid="debts-strip-balance-value"
                className="m-0 text-[20px] font-extrabold tabular-nums text-eb-text"
              >
                {fmt0(owedBalance)}
              </dd>
            </div>
          </dl>
          <p
            data-testid="debts-strip-snapshot-note"
            className="mt-2 inline-flex items-start gap-1.5 text-[11.5px] text-eb-text/55"
          >
            <Info className="mt-px h-3 w-3 flex-none opacity-70" strokeWidth={2} />
            <span>{t("stripSnapshotNote")}</span>
          </p>
        </div>
      </div>

      {/* Breakdown summary is gated on summary truth (interest / fee /
          shortfall presence), not on the per-type meter. A zero-payment
          included debt with a shortfall must still surface the advisory
          even though the meter has nothing to split. The component
          self-suppresses when there is nothing meaningful to say. */}
      <DebtsStripBreakdownSummary summary={summary} fmt0={fmt0} t={t} />

      {showMeter ? (
        <div className="mt-3" data-testid="debts-strip-meter">
          <p className="m-0 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-eb-text/50">
            {t("stripMeterCaption")}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {DEBT_TYPE_BUCKET_ORDER.map((bucket) => {
              const value = split[bucket];
              if (value <= 0) return null;
              const pct = Math.round((value / splitTotal) * 100);
              const label =
                bucket === "loan"
                  ? t("stripMeterLoan")
                  : bucket === "credit"
                  ? t("stripMeterCredit")
                  : t("stripMeterInstallment");
              return (
                <div
                  key={bucket}
                  data-bucket={bucket}
                  data-testid={`debts-strip-meter-label-${bucket}`}
                  className="flex min-w-[92px] flex-col"
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-eb-text/55">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-2 w-2 flex-none rounded-sm",
                        TYPE_DOT_CLASS[bucket],
                      )}
                    />
                    {label}
                  </span>
                  <span className="mt-0.5 whitespace-nowrap text-[13px] font-extrabold tabular-nums text-eb-text">
                    {fmt0(value)}
                    <span className="ml-1 text-[12px] font-bold text-eb-text/55">
                      · {pct} %
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex h-3.5 gap-1 overflow-hidden rounded-full bg-transparent">
            {DEBT_TYPE_BUCKET_ORDER.map((bucket) => {
              const value = split[bucket];
              if (value <= 0) return null;
              return (
                <span
                  key={bucket}
                  aria-hidden="true"
                  data-testid={`debts-strip-meter-seg-${bucket}`}
                  className={cn(
                    "block rounded-[4px]",
                    TYPE_DOT_CLASS[bucket],
                  )}
                  style={{ flex: `${value} 1 0` }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Debt Polish PR 1: explanatory split of the included monthly payment total
 * into interest / fee / principal, plus a projected end-of-month liability
 * balance. Renders only when there are included rows (the meter is the
 * gating signal — same condition). PR 3 will restyle this to lead over the
 * per-type meter; for PR 1 it sits above the meter as a calm supplement.
 *
 * Math comes straight from `summary.includedMonthlyInterestTotal` etc — the
 * backend already enforced the formula, so the FE only formats and labels.
 */
function DebtsStripBreakdownSummary({
  summary,
  fmt0,
  t,
}: {
  summary: DebtEditorSummaryDto;
  fmt0: (value: number) => string;
  t: <K extends keyof typeof debtsEditorPageDict.sv>(key: K) => string;
}) {
  const interest = summary.includedMonthlyInterestTotal;
  const fee = summary.includedMonthlyFeeTotal;
  const principal = summary.includedPrincipalPaymentTotal;
  const projected = summary.projectedActiveLiabilityBalanceAfterMonth;
  const below = summary.rowsBelowInterestAndFeesCount;

  // When every included row covers interest + fee perfectly *and* none of
  // them carry APR or fee, the breakdown collapses to "principal = payment"
  // with everything else 0. That conveys no new information, so suppress
  // the whole block to keep the strip calm.
  if (interest <= 0 && fee <= 0 && below === 0) return null;

  return (
    <div className="mt-3" data-testid="debts-strip-breakdown">
      <p className="m-0 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-eb-text/50">
        {t("stripBreakdownCaption")}
      </p>
      {/* MVP cleanup: explainer mirrors the row-level helper so the strip
          summary and per-row split read as one coherent grammar. */}
      <p
        data-testid="debts-strip-breakdown-helper"
        className="mt-1 text-[12px] leading-snug text-eb-text/55"
      >
        {t("breakdownHelper")}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] text-eb-text/55">
            {t("stripBreakdownInterestLabel")}
          </dt>
          <dd
            data-testid="debts-strip-breakdown-interest"
            className="m-0 text-[14px] font-extrabold tabular-nums text-eb-text"
          >
            {fmt0(interest)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] text-eb-text/55">
            {t("stripBreakdownFeeLabel")}
          </dt>
          <dd
            data-testid="debts-strip-breakdown-fee"
            className="m-0 text-[14px] font-extrabold tabular-nums text-eb-text"
          >
            {fmt0(fee)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] text-eb-text/55">
            {t("stripBreakdownPrincipalLabel")}
          </dt>
          <dd
            data-testid="debts-strip-breakdown-principal"
            className={cn(
              "m-0 text-[14px] font-extrabold tabular-nums",
              principal > 0 ? "text-[#166534]" : "text-eb-text/55",
            )}
          >
            {fmt0(principal)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] text-eb-text/55">
            {t("stripBreakdownProjectedLabel")}
          </dt>
          <dd
            data-testid="debts-strip-breakdown-projected"
            className="m-0 text-[14px] font-extrabold tabular-nums text-eb-text"
          >
            {fmt0(projected)}
          </dd>
        </div>
      </dl>
      {below > 0 ? (
        <p
          data-testid="debts-strip-breakdown-shortfall"
          role="note"
          className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-eb-warning/35 bg-[rgb(217_119_6_/0.08)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#7c4a03]"
        >
          <Info className="mt-px h-3 w-3 flex-none opacity-80" strokeWidth={2} />
          <span>
            {(below === 1
              ? t("stripBreakdownShortfallOne")
              : t("stripBreakdownShortfallOther")
            ).replace("{count}", String(below))}
          </span>
        </p>
      ) : null}
    </div>
  );
}
