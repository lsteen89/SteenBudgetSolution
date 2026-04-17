import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { ExpenseLedgerRowVm } from "../types/expenseEditor.types";
import ExpenseRowActionsMenu from "./ExpenseRowActionsMenu";
import { expenseLedgerDesktopGridClass } from "./expenseLedger.layout";

type ExpensesLedgerRowProps = {
  row: ExpenseLedgerRowVm;
  readOnly?: boolean;
  onEdit: (row: ExpenseLedgerRowVm) => void;
  onPauseToggle: (row: ExpenseLedgerRowVm) => void;
  onDelete: (row: ExpenseLedgerRowVm) => void;
};

export default function ExpensesLedgerRow({
  row,
  readOnly = false,
  onEdit,
  onPauseToggle,
  onDelete,
}: ExpensesLedgerRowProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();

  const displayAmount = formatMoneyV2(row.amountMonthly, currency, locale, {
    fractionDigits: 2,
  });

  return (
    <div
      className={cn(
        "border-t border-eb-stroke/12 px-4 py-4 sm:px-6",
        "transition-colors hover:bg-[rgb(var(--eb-shell)/0.08)]",
        row.isActive
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
                row.isActive ? "text-eb-text" : "text-eb-text/72",
              )}
            >
              {row.name}
            </div>

            <div
              className={cn(
                "mt-1 text-sm",
                row.isActive ? "text-eb-text/58" : "text-eb-text/62",
              )}
            >
              {row.categoryLabel}
            </div>

            {!row.isActive ? (
              <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                Pausad
              </div>
            ) : null}
          </div>

          <div className="flex items-start gap-2 pl-2">
            <div
              className={cn(
                "whitespace-nowrap pt-0.5 text-right text-sm font-bold tabular-nums",
                row.isActive ? "text-eb-text" : "text-eb-text/72",
              )}
            >
              {displayAmount}
            </div>

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

      {/* Desktop */}
      <div className={cn("hidden sm:grid", expenseLedgerDesktopGridClass)}>
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-sm font-semibold",
              row.isActive ? "text-eb-text" : "text-eb-text/72",
            )}
          >
            {row.name}
          </div>

          {!row.isActive ? (
            <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              Pausad
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "min-w-0 truncate text-sm",
            row.isActive ? "text-eb-text/58" : "text-eb-text/62",
          )}
        >
          {row.categoryLabel}
        </div>

        <div
          className={cn(
            "min-w-0 text-right text-sm font-bold tabular-nums",
            row.isActive ? "text-eb-text" : "text-eb-text/72",
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
