import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";
import { expenseLedgerRowDict } from "@/utils/i18n/pages/private/expenses/ExpenseLedgerRow.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { ExpenseLedgerRowVm } from "../types/expenseEditor.types";
import ExpenseRowActionsMenu from "./ExpenseRowActionsMenu";

type ExpensesLedgerRowProps = {
  row: ExpenseLedgerRowVm;
  readOnly?: boolean;
  onEdit: (row: ExpenseLedgerRowVm) => void;
  onPauseToggle: (row: ExpenseLedgerRowVm) => void;
  onLifecycleChange: (
    row: ExpenseLedgerRowVm,
    next: SubscriptionLifecycleStatus,
  ) => void;
  onDelete: (row: ExpenseLedgerRowVm) => void;
};

type RowStatus = {
  /** Status text shown under the category. Empty for a quiet, normal row. */
  text: string | null;
  /** Exceptions that take the row out of the month total read amber. */
  tone: "exception" | "info";
};

/**
 * Build the single status line. The product rule (task 1) is that a normal
 * plan-linked row shows *no* status — only meaningful exceptions surface:
 *
 *   - Inaktiv            (manually toggled off)
 *   - Pausad denna månad (subscription paused)
 *   - Avslutad           (subscription cancelled)
 *   - Endast denna månad (month-only row)
 *   - Ändrad mot planen · {delta} (plan-linked row diverging from the plan)
 *
 * Non-counting states (inactive/paused/cancelled) are the dominant signal, so
 * when present they own the line and read amber. Counting rows may combine the
 * month-only marker with the plan-change marker, joined by a calm middot.
 */
function buildRowStatus(
  row: ExpenseLedgerRowVm,
  t: (key: keyof typeof expenseLedgerRowDict.sv) => string,
  formatDeltaAbs: (value: number) => string,
): RowStatus {
  switch (row.state) {
    case "inactive":
      return { text: t("inactive"), tone: "exception" };
    case "subscriptionPaused":
      return { text: t("paused"), tone: "exception" };
    case "subscriptionCancelled":
      return { text: t("cancelled"), tone: "exception" };
    case "active":
    default:
      break;
  }

  const segments: string[] = [];

  if (row.sourceKind === "monthOnly") {
    segments.push(t("onlyThisMonth"));
  }

  // Plan-comparison is gated on real source-plan data (PR 5). hasPlanLink is
  // false for month-only rows and for linked rows with partial source data,
  // so we never fabricate "Ändrad mot planen" from frontend-only state.
  const comparison = row.planComparison;
  if (comparison.hasPlanLink && comparison.changedInMonth) {
    const delta = comparison.amountDelta ?? 0;
    if (delta !== 0) {
      const deltaCopy = (
        delta > 0 ? t("deltaHigherThanPlan") : t("deltaLowerThanPlan")
      ).replace("{amount}", formatDeltaAbs(Math.abs(delta)));
      segments.push(`${t("changedFromPlan")} · ${deltaCopy}`);
    } else {
      // Name/category/active changed but the amount did not — show the badge
      // without a money line (never "+0 kr").
      segments.push(t("changedFromPlan"));
    }
  }

  return {
    text: segments.length > 0 ? segments.join(" · ") : null,
    tone: "info",
  };
}

export default function ExpensesLedgerRow({
  row,
  readOnly = false,
  onEdit,
  onPauseToggle,
  onLifecycleChange,
  onDelete,
}: ExpensesLedgerRowProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof expenseLedgerRowDict.sv>(key: K) =>
    tDict(key, locale, expenseLedgerRowDict);

  // Display money is whole-krona everywhere (task 2). Only editable inputs
  // keep cents.
  const displayAmount = formatMoneyV2(row.amountMonthly, currency, locale, {
    fractionDigits: 0,
  });
  const formatDeltaAbs = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  const countsInTotal = row.countsInMonthlyTotal;
  const status = buildRowStatus(row, t, formatDeltaAbs);

  return (
    <div
      data-testid="expense-ledger-row"
      data-row-id={row.id}
      data-row-state={row.state}
      data-row-source-kind={row.sourceKind}
      className={cn(
        "group flex items-start gap-3 border-t border-eb-stroke/12 px-4 py-3.5 sm:px-6",
        "transition-colors hover:bg-[rgb(var(--eb-shell)/0.08)]",
        // Paused/inactive is a valid planned state, not an error — keep it
        // quiet. A faint neutral wash (no warning stripe, no amber fill) plus
        // muted text separates it from active rows without alarming.
        countsInTotal ? "bg-transparent" : "bg-[rgb(var(--eb-shell)/0.05)]",
      )}
    >
      {/* Identity: name, category, and only-when-needed status. */}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[15px] font-semibold leading-tight",
            countsInTotal ? "text-eb-text" : "text-eb-text/70",
          )}
        >
          {row.name}
        </div>

        <div
          className={cn(
            "mt-0.5 truncate text-[13px]",
            countsInTotal ? "text-eb-text/55" : "text-eb-text/55",
          )}
        >
          {row.categoryLabel}
        </div>

        {status.text ? (
          <div
            data-testid="expense-ledger-row-status"
            className={cn(
              "mt-1 truncate text-[12px] tabular-nums",
              // Muted amber for the planned-state cue — readable, not an
              // alert. Plain muted text for informational status (month-only,
              // changed-from-plan).
              status.tone === "exception"
                ? "text-amber-700/80"
                : "text-eb-text/50",
            )}
          >
            {status.text}
          </div>
        ) : null}
      </div>

      {/* Money + actions, right-aligned. */}
      <div className="flex shrink-0 items-center gap-1">
        <div
          className={cn(
            "whitespace-nowrap text-right text-[15px] font-semibold tabular-nums",
            countsInTotal ? "text-eb-text" : "text-eb-text/60",
          )}
        >
          {displayAmount}
        </div>

        <ExpenseRowActionsMenu
          readOnly={readOnly}
          isActive={row.isActive}
          isSubscription={row.isSubscription}
          subscriptionLifecycleStatus={row.subscriptionLifecycleStatus}
          onEdit={() => onEdit(row)}
          onPauseToggle={() => onPauseToggle(row)}
          onLifecycleChange={(next) => onLifecycleChange(row, next)}
          onDelete={() => onDelete(row)}
        />
      </div>
    </div>
  );
}
