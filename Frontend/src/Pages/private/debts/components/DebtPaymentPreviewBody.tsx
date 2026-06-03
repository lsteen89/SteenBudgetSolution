import { cn } from "@/lib/utils";
import type { DebtMonthlyPaymentBreakdownDto } from "@/types/budget/DebtEditorDto";

/**
 * Debt Polish PR 2: shared body for the dirty-form `EditorPreviewCard` used
 * by the three Debt modals. Renders the backend-mirroring breakdown grid
 * (interest · fee · principal), the projected post-month balance, the
 * "balance unchanged" promise, and the amber shortfall advisory.
 *
 * Stateless presentation: the parent decides whether to render it (i.e.
 * whether the row carries enough input to compute a meaningful breakdown)
 * and supplies the already-computed `breakdown` plus localized labels.
 * Numbers flow straight from `calcDebtPaymentBreakdown(...)` so the FE
 * preview never drifts from the PR 1 backend formula.
 */
export type DebtPaymentPreviewBodyLabels = {
  interestLabel: string;
  feeLabel: string;
  principalLabel: string;
  projectedAfterLabel: string;
  balanceUnchangedNote: string;
  shortfallAdvisory: string;
  shortfallAmountTemplate: string;
};

type DebtPaymentPreviewBodyProps = {
  breakdown: DebtMonthlyPaymentBreakdownDto;
  labels: DebtPaymentPreviewBodyLabels;
  formatAmount: (value: number) => string;
  /** Optional `data-testid` prefix so callers can scope assertions. */
  testIdPrefix?: string;
  /** Extra content rendered above the breakdown grid (scope columns, etc). */
  header?: React.ReactNode;
};

export default function DebtPaymentPreviewBody({
  breakdown,
  labels,
  formatAmount,
  testIdPrefix = "debt-preview",
  header,
}: DebtPaymentPreviewBodyProps) {
  return (
    <div className="grid gap-2.5" data-testid={`${testIdPrefix}-body`}>
      {header}

      <dl
        data-testid={`${testIdPrefix}-grid`}
        className="grid grid-cols-3 gap-x-3 gap-y-1 rounded-xl border border-eb-stroke/18 bg-white/62 px-3 py-2.5"
      >
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-eb-text/45">
            {labels.interestLabel}
          </dt>
          <dd
            data-testid={`${testIdPrefix}-interest`}
            className="mt-0.5 text-[13px] font-semibold tabular-nums text-eb-text"
          >
            {formatAmount(breakdown.monthlyInterest)}
          </dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-eb-text/45">
            {labels.feeLabel}
          </dt>
          <dd
            data-testid={`${testIdPrefix}-fee`}
            className="mt-0.5 text-[13px] font-semibold tabular-nums text-eb-text"
          >
            {formatAmount(breakdown.monthlyFee)}
          </dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-eb-text/45">
            {labels.principalLabel}
          </dt>
          <dd
            data-testid={`${testIdPrefix}-principal`}
            className={cn(
              "mt-0.5 text-[13px] font-semibold tabular-nums",
              breakdown.principalPayment > 0
                ? "text-[#166534]"
                : "text-eb-text/55",
            )}
          >
            {formatAmount(breakdown.principalPayment)}
          </dd>
        </div>
      </dl>

      {/* Projected balance is always visible — including under shortfall —
          so the user sees the useful truth that "balance stays at X kr this
          month" rather than only being told the payment is too low. The
          amber advisory below adds the why; together they tell the full
          story without hiding the number. */}
      <div className="flex items-baseline justify-between gap-3 text-[12px] text-eb-text/65">
        <span className="font-semibold text-eb-text/70">
          {labels.projectedAfterLabel}
        </span>
        <span
          data-testid={`${testIdPrefix}-projected`}
          className="tabular-nums text-eb-text"
        >
          {formatAmount(breakdown.projectedBalanceAfterMonth)}
        </span>
      </div>

      {breakdown.coversInterestAndFees ? null : (
        <div
          data-testid={`${testIdPrefix}-shortfall`}
          role="note"
          className="rounded-md border border-eb-warning/35 bg-[rgb(217_119_6_/0.08)] px-2.5 py-1.5 text-[12px] text-[#7c4a03]"
        >
          <span className="font-semibold">{labels.shortfallAdvisory}</span>{" "}
          <span className="tabular-nums">
            {labels.shortfallAmountTemplate.replace(
              "{amount}",
              formatAmount(breakdown.interestAndFeeShortfall),
            )}
          </span>
        </div>
      )}

      <p className="text-[11.5px] text-eb-text/55">
        {labels.balanceUnchangedNote}
      </p>
    </div>
  );
}
