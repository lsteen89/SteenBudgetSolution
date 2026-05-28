import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { expenseLedgerRowDict } from "@/utils/i18n/pages/private/expenses/ExpenseLedgerRow.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type {
  ExpenseLedgerRowState,
  ExpenseLedgerRowVm,
} from "../types/expenseEditor.types";
import ExpenseRowActionsMenu from "./ExpenseRowActionsMenu";
import { expenseLedgerDesktopGridClass } from "./expenseLedger.layout";

type ExpensesLedgerRowProps = {
  row: ExpenseLedgerRowVm;
  readOnly?: boolean;
  onEdit: (row: ExpenseLedgerRowVm) => void;
  onPauseToggle: (row: ExpenseLedgerRowVm) => void;
  onDelete: (row: ExpenseLedgerRowVm) => void;
};

function stateBadgeLabel(
  state: ExpenseLedgerRowState,
  t: (key: keyof typeof expenseLedgerRowDict.sv) => string,
): string | null {
  switch (state) {
    case "subscriptionPaused":
      return t("paused");
    case "subscriptionCancelled":
      return t("cancelled");
    case "inactive":
      return t("inactive");
    case "active":
    default:
      return null;
  }
}

export default function ExpensesLedgerRow({
  row,
  readOnly = false,
  onEdit,
  onPauseToggle,
  onDelete,
}: ExpensesLedgerRowProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof expenseLedgerRowDict.sv>(key: K) =>
    tDict(key, locale, expenseLedgerRowDict);

  const displayAmount = formatMoneyV2(row.amountMonthly, currency, locale, {
    fractionDigits: 2,
  });

  const countsInTotal = row.countsInMonthlyTotal;
  const badge = stateBadgeLabel(row.state, t);
  const showMonthOnlyPill = row.sourceKind === "monthOnly";
  // Generic pause/resume only flips isActive. For lifecycle-paused or
  // lifecycle-cancelled subscriptions, that action would not actually resume
  // the subscription (lifecycle stays paused/cancelled), so hide it here.
  // PR 4 wires real subscription lifecycle controls.
  const canPauseToggle =
    row.state !== "subscriptionPaused" && row.state !== "subscriptionCancelled";

  return (
    <div
      data-testid="expense-ledger-row"
      data-row-id={row.id}
      data-row-state={row.state}
      data-row-source-kind={row.sourceKind}
      className={cn(
        "border-t border-eb-stroke/12 px-4 py-4 sm:px-6",
        "transition-colors hover:bg-[rgb(var(--eb-shell)/0.08)]",
        countsInTotal
          ? "bg-transparent"
          : "border-l-4 border-l-amber-300/55 bg-amber-50/25",
      )}
    >
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-[15px] font-semibold",
                countsInTotal ? "text-eb-text" : "text-eb-text/72",
              )}
            >
              {row.name}
            </div>

            <div
              className={cn(
                "mt-1 text-sm",
                countsInTotal ? "text-eb-text/58" : "text-eb-text/62",
              )}
            >
              {row.categoryLabel}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {badge ? (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                  {badge}
                </span>
              ) : null}
              {showMonthOnlyPill ? (
                <span className="inline-flex rounded-full border border-eb-stroke/25 bg-white/45 px-2.5 py-1 text-[11px] font-medium text-eb-text/65">
                  {t("onlyThisMonth")}
                </span>
              ) : null}
            </div>

            {!countsInTotal ? (
              <div className="mt-1.5 text-[11px] text-eb-text/55">
                {t("doesNotCount")}
              </div>
            ) : null}
          </div>

          <div className="flex items-start gap-2 pl-2">
            <div
              className={cn(
                "whitespace-nowrap pt-0.5 text-right text-sm font-bold tabular-nums",
                countsInTotal ? "text-eb-text" : "text-eb-text/72",
              )}
            >
              {displayAmount}
            </div>

            <ExpenseRowActionsMenu
              readOnly={readOnly}
              isActive={row.isActive}
              canPauseToggle={canPauseToggle}
              onEdit={() => onEdit(row)}
              onPauseToggle={() => onPauseToggle(row)}
              onDelete={() => onDelete(row)}
            />
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className={cn("hidden sm:grid", expenseLedgerDesktopGridClass)}>
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-sm font-semibold",
              countsInTotal ? "text-eb-text" : "text-eb-text/72",
            )}
          >
            {row.name}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {badge ? (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                {badge}
              </span>
            ) : null}
            {showMonthOnlyPill ? (
              <span className="inline-flex rounded-full border border-eb-stroke/25 bg-white/45 px-2.5 py-1 text-[11px] font-medium text-eb-text/65">
                {t("onlyThisMonth")}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 truncate text-sm",
            countsInTotal ? "text-eb-text/58" : "text-eb-text/62",
          )}
        >
          {row.categoryLabel}
        </div>

        <div
          className={cn(
            "min-w-0 text-right text-sm font-bold tabular-nums",
            countsInTotal ? "text-eb-text" : "text-eb-text/72",
          )}
        >
          <span className="block truncate">{displayAmount}</span>
        </div>

        <div className="flex justify-end">
          <ExpenseRowActionsMenu
            readOnly={readOnly}
            isActive={row.isActive}
            onEdit={() => onEdit(row)}
            onPauseToggle={() => onPauseToggle(row)}
            onDelete={() => onDelete(row)}
          />
        </div>
      </div>
    </div>
  );
}
