import BudgetEditorRowActionsMenu, {
  type BudgetEditorRowActionItem,
} from "@/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  bucketDebtType,
  type DebtTypeBucket,
} from "../utils/debtTypeSplit";
import { primaryReason, reasonKeyFor } from "../utils/debtEditorReason";
import type { DebtLifecycleAction } from "./DebtLifecycleConfirmDialog";

type DebtLedgerRowProps = {
  row: DebtEditorRowDto;
  /** Display label for the open month (`maj 2026`). */
  yearMonthLabel: string;
  /**
   * Page-level read-only flag (closed/skipped month). When true, row actions
   * always render as disabled, ignoring per-row `Actions` permissions.
   */
  readOnly: boolean;
  /**
   * Called when the user picks the planned-payment edit action. PR 6 wired
   * this action; PR 7 adds `onEditDetails` alongside it.
   */
  onEditPayment: (row: DebtEditorRowDto) => void;
  /**
   * Debt PR 7 — opens the edit-details drawer. Optional so callers that
   * pre-date PR 7 (and existing tests) keep their existing kebab. When
   * wired, the action surfaces only when the backend `actions.canEditDetails`
   * flag is true.
   */
  onEditDetails?: (row: DebtEditorRowDto) => void;
  /**
   * Debt PR 8 — opens the lifecycle / participation confirmation dialog for
   * the chosen action. Optional so pre-PR-8 callers and existing tests keep
   * the same kebab. Each lifecycle item surfaces only when the matching
   * backend `actions.*` permission allows it — the FE never infers lifecycle
   * state from zero payment or zero balance.
   */
  onLifecycleAction?: (row: DebtEditorRowDto, action: DebtLifecycleAction) => void;
  /**
   * Debt PR 9 — opens the `Uppdatera saldo` drawer. Surfaces only when the
   * backend `actions.canUpdateBalance` flag is true.
   */
  onUpdateBalance?: (row: DebtEditorRowDto) => void;
  /**
   * Debt PR 9 — opens the repayment-progress view. Surfaces only when the row
   * carries real `progress` data from the PR 5 read model; a debt with no
   * recorded balance events never shows the action (no fabricated progress).
   */
  onViewProgress?: (row: DebtEditorRowDto) => void;
};

const TYPE_DOT_CLASS: Record<DebtTypeBucket, string> = {
  loan: "bg-[rgb(var(--eb-shell-3)/0.92)]",
  credit: "bg-[rgb(var(--eb-shell-2))]",
  installment: "bg-[rgb(var(--eb-stroke-strong))]",
};

const interpolate = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

export default function DebtLedgerRow({
  row,
  yearMonthLabel,
  readOnly,
  onEditPayment,
  onEditDetails,
  onLifecycleAction,
  onUpdateBalance,
  onViewProgress,
}: DebtLedgerRowProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, debtsEditorPageDict);

  const balanceText = formatMoneyV2(row.balance, currency, locale, {
    fractionDigits: 0,
  });

  // Only the active group renders the literal planned-payment amount. Skipped,
  // paid, and archived rows show an em-dash because the payment is genuinely
  // not contributing this month — the lifecycle/participation state is the
  // reason, never the numeric value. A zero in the active group is a real
  // planned amount and must render as `0`, not as `—`.
  const showPaymentValue = row.group === "active";
  const paymentText = showPaymentValue
    ? formatMoneyV2(row.monthlyPayment, currency, locale, { fractionDigits: 0 })
    : t("rowEmptyPayment");

  const typeBucket = bucketDebtType(row.type);
  const typeLabel =
    typeBucket === "loan"
      ? t("rowMetaLoanLabel")
      : typeBucket === "credit"
      ? t("rowMetaCreditLabel")
      : t("rowMetaInstallmentLabel");

  const metaParts: string[] = [typeLabel];
  if (row.apr > 0) {
    metaParts.push(
      interpolate(t("rowMetaApr"), { value: formatPercent(row.apr, locale) }),
    );
  }
  if (row.monthlyFee !== null && row.monthlyFee > 0) {
    metaParts.push(
      interpolate(t("rowMetaFee"), {
        value: formatMoneyV2(row.monthlyFee, currency, locale, {
          fractionDigits: 0,
        }),
      }),
    );
  }
  if (row.minPayment !== null && row.minPayment > 0) {
    metaParts.push(
      interpolate(t("rowMetaMinPayment"), {
        value: formatMoneyV2(row.minPayment, currency, locale, {
          fractionDigits: 0,
        }),
      }),
    );
  }
  // Skipped rows: show the planned payment the row would have contributed
  // this month. For source-linked rows that's `sourceMonthlyPayment` (the
  // plan's value). For month-only rows there is no source plan, so the
  // row's own `monthlyPayment` *is* the plan for that month — fall back to
  // it so the user does not lose the planned context the moment the row
  // moves to `skipped`.
  if (row.group === "skipped") {
    const plannedAmount = row.sourceMonthlyPayment ?? row.monthlyPayment;
    if (plannedAmount > 0) {
      metaParts.push(
        interpolate(t("rowMetaPlanPayment"), {
          value: formatMoneyV2(plannedAmount, currency, locale, {
            fractionDigits: 0,
          }),
        }),
      );
    }
  }
  const metaText = metaParts.join(` ${t("rowMetaSeparator")} `);

  const badges: { key: string; label: string; tone: "neutral" | "skip" | "done" }[] =
    [];
  if (row.group === "skipped") {
    badges.push({
      key: "skipped",
      label: interpolate(t("rowBadgeSkipped"), { yearMonthLabel }),
      tone: "skip",
    });
  }
  if (row.group === "paid") {
    badges.push({
      key: "paid",
      label: t("rowBadgePaid"),
      tone: "done",
    });
  }
  if (row.isMonthOnly && row.group !== "paid" && row.group !== "archived") {
    badges.push({
      key: "monthOnly",
      label: interpolate(t("rowBadgeMonthOnly"), { yearMonthLabel }),
      tone: "neutral",
    });
  }

  // Row action menu — unwired row actions are intentionally hidden until
  // PR 7-9 ship their submit flows. The kebab renders disabled only when no
  // wired action is currently available (e.g. the backend says
  // CanEditPayment=false) or when the page is read-only. Showing a row
  // action as "disabled-with-PR-marker" would be a fake affordance — the
  // BudgetEditorRowActionsMenu primitive has no concept of a clickable-yet-
  // inert item, and the design's per-lifecycle kebab variants belong to
  // PR 7-9 where each item gets real wiring.
  const items = buildActionItems(
    row,
    t,
    onEditPayment,
    onEditDetails,
    onLifecycleAction,
    onUpdateBalance,
    onViewProgress,
  );

  // Inline repayment-progress bar. Renders only when the PR 5 read model
  // carries real `DebtBalanceEvent`-derived progress — never synthesised from
  // current-vs-original balance. Hidden for paid/archived rows where the
  // remaining figure is no longer the planning focus, matching the target
  // mockup (progress lives on active / skipped rows).
  const showProgress =
    row.progress !== null &&
    row.progress.percentPaid !== null &&
    (row.group === "active" || row.group === "skipped");
  const progressNode = showProgress ? (
    <RowProgressBar
      percentPaid={row.progress!.percentPaid!}
      currentBalance={row.progress!.currentBalance}
      firstBalance={row.progress!.firstBalance}
      currency={currency}
      locale={locale}
      paidLabelTemplate={t("rowProgressPaid")}
      remainingLabelTemplate={t("rowProgressRemaining")}
    />
  ) : null;

  // Debt Polish PR 1: backend-owned breakdown of this row's planned monthly
  // payment. Renders for active rows where the cash outflow is actually
  // contributing this month. Skipped / paid / archived rows hide it because
  // no payment is applied and the surface would just be noise. This is NOT
  // the progress bar — progress is historical, breakdown is forward-looking.
  const showBreakdown = row.group === "active";
  const breakdownNode = showBreakdown ? (
    <RowPaymentBreakdown
      breakdown={row.paymentBreakdown}
      currency={currency}
      locale={locale}
      sectionLabel={t("breakdownSectionLabel")}
      helperText={t("breakdownHelper")}
      interestLabel={t("breakdownInterestLabel")}
      feeLabel={t("breakdownFeeLabel")}
      principalLabel={t("breakdownPrincipalLabel")}
      projectedAfterLabel={t("breakdownProjectedAfterLabel")}
      shortfallAdvisory={t("breakdownShortfallAdvisory")}
      shortfallAmountTemplate={t("breakdownShortfallAmount")}
    />
  ) : null;

  const reasons = row.disabledReasons;
  const tooltipReason = primaryReason(reasons);
  const tooltipReasonKey = tooltipReason ? reasonKeyFor(tooltipReason) : null;
  const tooltipText = tooltipReasonKey ? t(tooltipReasonKey) : t("rowActionsDisabled");

  return (
    <div
      data-testid="debt-ledger-row"
      data-row-id={row.id}
      data-group={row.group}
      data-source-lifecycle={row.sourceLifecycleStatus ?? "none"}
      data-participation={row.participationStatus}
      className={cn(
        "border-t border-eb-stroke/12 px-4 py-4 sm:px-5",
        row.group === "active"
          ? "hover:bg-[rgb(var(--eb-shell)/0.08)]"
          : "opacity-90",
      )}
    >
      <div className="sm:hidden">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full",
              TYPE_DOT_CLASS[typeBucket],
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="truncate text-[15px] font-bold text-eb-text">
                {row.name}
              </span>
              {badges.map((badge) => (
                <RowBadge key={badge.key} tone={badge.tone}>
                  {badge.label}
                </RowBadge>
              ))}
            </div>
            <p className="mt-1 text-[12.5px] text-eb-text/58">{metaText}</p>
            {breakdownNode}
            {progressNode}
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[12px] text-eb-text/55">
                {t("rowCellBalance")}:
                <strong className="ml-1.5 text-[14px] font-extrabold tabular-nums text-eb-text">
                  {balanceText}
                </strong>
              </span>
              <span className="text-[12px] text-eb-text/55">
                {t("rowCellPayment")}:
                <strong className="ml-1.5 text-[14px] font-extrabold tabular-nums text-eb-text">
                  {paymentText}
                </strong>
              </span>
            </div>
          </div>
          <div className="pt-0.5">
            <BudgetEditorRowActionsMenu
              readOnly={readOnly || items.length === 0}
              disabledAriaLabel={tooltipText}
              openAriaLabel={t("rowActionsOpen")}
              items={items}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "hidden sm:grid sm:items-center sm:gap-x-5",
          "sm:grid-cols-[minmax(0,1.7fr)_minmax(120px,1fr)_minmax(120px,1fr)_56px]",
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-2.5 w-2.5 flex-none rounded-full",
                TYPE_DOT_CLASS[typeBucket],
              )}
            />
            <span className="truncate text-[15px] font-bold text-eb-text">
              {row.name}
            </span>
            {badges.map((badge) => (
              <RowBadge key={badge.key} tone={badge.tone}>
                {badge.label}
              </RowBadge>
            ))}
          </div>
          <p className="mt-1 text-[12.5px] text-eb-text/58">{metaText}</p>
          {breakdownNode}
          {progressNode}
        </div>

        <div className="min-w-0">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-eb-text/45">
            {t("rowCellBalance")}
          </div>
          <div
            data-testid="debt-row-balance"
            className="mt-0.5 truncate text-[15px] font-extrabold tabular-nums text-eb-text"
          >
            {balanceText}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-eb-text/45">
            {t("rowCellPayment")}
          </div>
          <div
            data-testid="debt-row-payment"
            data-empty={!showPaymentValue}
            className={cn(
              "mt-0.5 truncate text-[15px] font-extrabold tabular-nums",
              showPaymentValue ? "text-eb-text" : "text-eb-text/45",
            )}
          >
            {paymentText}
          </div>
        </div>

        <div className="flex justify-end">
          <BudgetEditorRowActionsMenu
            readOnly={readOnly || items.length === 0}
            disabledAriaLabel={tooltipText}
            openAriaLabel={t("rowActionsOpen")}
            items={items}
          />
        </div>
      </div>
    </div>
  );
}

// Debt Polish PR 3: action menu is grouped to stay scannable as more
// lifecycle / participation actions joined the kebab through PR 6-9. The
// shared `BudgetEditorRowActionsMenu` primitive draws a separator between
// adjacent items whose `group` differs, so the visual rhythm is:
//
//   Planning      Redigera planerad betalning
//                 Redigera uppgifter
//                 Uppdatera saldo
//                 ─────────────────────────────
//   Insight       Visa återbetalningsförlopp
//                 ─────────────────────────────
//   This month    Hoppa över denna månad
//                 Inkludera denna månad
//                 ─────────────────────────────
//   Lifecycle     Markera som betald
//                 Arkivera
//                 Återställ skuld
//                 ─────────────────────────────
//   Destructive   Ta bort
//
// A group only contributes a separator when there is a real item before AND
// after it — the primitive doesn't draw orphan dividers, so a row with only
// planning actions still renders cleanly.
type DebtActionGroup =
  | "planning"
  | "insight"
  | "thisMonth"
  | "lifecycle"
  | "destructive";

function buildActionItems(
  row: DebtEditorRowDto,
  t: <K extends keyof typeof debtsEditorPageDict.sv>(key: K) => string,
  onEditPayment: (row: DebtEditorRowDto) => void,
  onEditDetails?: (row: DebtEditorRowDto) => void,
  onLifecycleAction?: (row: DebtEditorRowDto, action: DebtLifecycleAction) => void,
  onUpdateBalance?: (row: DebtEditorRowDto) => void,
  onViewProgress?: (row: DebtEditorRowDto) => void,
): (BudgetEditorRowActionItem & { group: DebtActionGroup })[] {
  const items: (BudgetEditorRowActionItem & { group: DebtActionGroup })[] = [];

  // ---------------------------------------------------------------- Planning
  // Every item stays gated on its matching backend permission (or, for
  // progress, on the presence of real read-model data) so the FE never
  // offers an action the command would reject or a progress view with
  // nothing behind it.
  if (row.actions.canEditPayment) {
    items.push({
      key: "edit-payment",
      label: t("rowActionEditPayment"),
      group: "planning",
      onSelect: () => onEditPayment(row),
    });
  }

  if (onEditDetails && row.actions.canEditDetails) {
    items.push({
      key: "edit-details",
      label: t("rowActionEditDetails"),
      group: "planning",
      onSelect: () => onEditDetails(row),
    });
  }

  if (onUpdateBalance && row.actions.canUpdateBalance) {
    items.push({
      key: "update-balance",
      label: t("rowActionUpdateBalance"),
      group: "planning",
      onSelect: () => onUpdateBalance(row),
    });
  }

  // ---------------------------------------------------------------- Insight
  if (onViewProgress && row.progress !== null) {
    items.push({
      key: "view-progress",
      label: t("rowActionViewProgress"),
      group: "insight",
      onSelect: () => onViewProgress(row),
    });
  }

  if (onLifecycleAction) {
    // ----------------------------------------------------------- This month
    // skip / include are mutually exclusive by permission, so only one
    // surfaces per row. Skip leads on active rows, include on skipped rows.
    if (row.actions.canSkipThisMonth) {
      items.push({
        key: "skip",
        label: t("rowActionSkip"),
        group: "thisMonth",
        onSelect: () => onLifecycleAction(row, "skip"),
      });
    }

    if (row.actions.canIncludeThisMonth) {
      items.push({
        key: "include",
        label: t("rowActionInclude"),
        group: "thisMonth",
        onSelect: () => onLifecycleAction(row, "include"),
      });
    }

    // ----------------------------------------------------------- Lifecycle
    if (row.actions.canMarkPaidOff) {
      items.push({
        key: "mark-paid",
        label: t("rowActionMarkPaid"),
        group: "lifecycle",
        onSelect: () => onLifecycleAction(row, "markPaidOff"),
      });
    }

    if (row.actions.canArchive) {
      items.push({
        key: "archive",
        label: t("rowActionArchive"),
        group: "lifecycle",
        onSelect: () => onLifecycleAction(row, "archive"),
      });
    }

    if (row.actions.canRestore) {
      items.push({
        key: "restore",
        label: t("rowActionRestore"),
        group: "lifecycle",
        onSelect: () => onLifecycleAction(row, "restore"),
      });
    }

    // ---------------------------------------------------------- Destructive
    // Month-only rows are the only ones the backend allows to be removed —
    // source-linked debts archive instead so history survives.
    if (row.actions.canRemove) {
      items.push({
        key: "remove",
        label: t("rowActionRemove"),
        tone: "danger",
        group: "destructive",
        onSelect: () => onLifecycleAction(row, "remove"),
      });
    }
  }

  return items;
}

function RowProgressBar({
  percentPaid,
  currentBalance,
  firstBalance,
  currency,
  locale,
  paidLabelTemplate,
  remainingLabelTemplate,
}: {
  percentPaid: number;
  currentBalance: number;
  firstBalance: number;
  currency: ReturnType<typeof useAppCurrency>;
  locale: string;
  paidLabelTemplate: string;
  remainingLabelTemplate: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentPaid)));
  const paidLabel = paidLabelTemplate.replace(
    "{percent}",
    String(clamped),
  );
  const remainingLabel = remainingLabelTemplate
    .replace(
      "{remaining}",
      formatMoneyV2(currentBalance, currency, locale, { fractionDigits: 0 }),
    )
    .replace(
      "{original}",
      formatMoneyV2(firstBalance, currency, locale, { fractionDigits: 0 }),
    );

  return (
    <div data-testid="debt-row-progress" className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--eb-shell-3)/0.12)]">
        <div
          className="h-full rounded-full bg-[rgb(var(--eb-accent))]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-[11.5px] text-eb-text/55">
        <span className="font-semibold text-eb-text/70">{paidLabel}</span>
        <span>{remainingLabel}</span>
      </div>
    </div>
  );
}

/**
 * Debt Polish PR 1: renders the backend-owned payment breakdown for an
 * active row. The numbers come straight from `paymentBreakdown` on the
 * editor read model — no client-side recomputation.
 *
 * Layout intent: a calm 3-up (interest · fee · principal) cell strip,
 * followed by the projected post-month balance on its own line. When the
 * planned payment does not cover interest + fee, an amber advisory replaces
 * the cells' implication-of-progress with an explicit "no reduction this
 * month" message.
 */
function RowPaymentBreakdown({
  breakdown,
  currency,
  locale,
  sectionLabel,
  helperText,
  interestLabel,
  feeLabel,
  principalLabel,
  projectedAfterLabel,
  shortfallAdvisory,
  shortfallAmountTemplate,
}: {
  breakdown: DebtEditorRowDto["paymentBreakdown"];
  currency: ReturnType<typeof useAppCurrency>;
  locale: string;
  sectionLabel: string;
  helperText: string;
  interestLabel: string;
  feeLabel: string;
  principalLabel: string;
  projectedAfterLabel: string;
  shortfallAdvisory: string;
  shortfallAmountTemplate: string;
}) {
  const fmt = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  return (
    <div data-testid="debt-row-breakdown" className="mt-2.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-eb-text/45">
        {sectionLabel}
      </div>
      {/* MVP cleanup: quiet one-line explainer so users understand why the
          breakdown adds up to the planned payment. Kept secondary — uppercase
          section label still owns the heading. */}
      <p
        data-testid="debt-row-breakdown-helper"
        className="mt-0.5 text-[11.5px] leading-snug text-eb-text/55"
      >
        {helperText}
      </p>
      <dl className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-1">
        <div>
          <dt className="text-[11px] text-eb-text/55">{interestLabel}</dt>
          <dd
            data-testid="debt-row-breakdown-interest"
            className="text-[13px] font-semibold tabular-nums text-eb-text"
          >
            {fmt(breakdown.monthlyInterest)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-eb-text/55">{feeLabel}</dt>
          <dd
            data-testid="debt-row-breakdown-fee"
            className="text-[13px] font-semibold tabular-nums text-eb-text"
          >
            {fmt(breakdown.monthlyFee)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-eb-text/55">{principalLabel}</dt>
          <dd
            data-testid="debt-row-breakdown-principal"
            className={cn(
              "text-[13px] font-semibold tabular-nums",
              breakdown.principalPayment > 0
                ? "text-[#166534]"
                : "text-eb-text/55",
            )}
          >
            {fmt(breakdown.principalPayment)}
          </dd>
        </div>
      </dl>
      {breakdown.coversInterestAndFees ? (
        <div className="mt-1.5 text-[11.5px] text-eb-text/55">
          <span className="font-semibold text-eb-text/70">
            {projectedAfterLabel}:
          </span>{" "}
          <span
            data-testid="debt-row-breakdown-projected"
            className="tabular-nums text-eb-text"
          >
            {fmt(breakdown.projectedBalanceAfterMonth)}
          </span>
        </div>
      ) : (
        <div
          data-testid="debt-row-breakdown-shortfall"
          role="note"
          className="mt-2 rounded-md border border-eb-warning/35 bg-[rgb(217_119_6_/0.08)] px-2.5 py-1.5 text-[11.5px] text-[#7c4a03]"
        >
          <span className="font-semibold">{shortfallAdvisory}</span>{" "}
          <span className="tabular-nums">
            {shortfallAmountTemplate.replace(
              "{amount}",
              fmt(breakdown.interestAndFeeShortfall),
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function RowBadge({
  tone,
  children,
}: {
  tone: "neutral" | "skip" | "done";
  children: React.ReactNode;
}) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" &&
          "border-eb-stroke/22 bg-white/50 text-eb-text/55",
        tone === "skip" &&
          "border-eb-warning/35 bg-[rgb(217_119_6_/0.10)] text-[#7c4a03]",
        tone === "done" &&
          "border-eb-accent/30 bg-eb-accentSoft text-[#166534]",
      )}
    >
      {children}
    </span>
  );
}

function formatPercent(value: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(value / 100);
}
