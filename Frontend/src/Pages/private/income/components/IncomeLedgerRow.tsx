import BudgetEditorRowActionsMenu, {
  type BudgetEditorRowActionItem,
} from "@/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { incomeLedgerRowDict } from "@/utils/i18n/pages/private/income/IncomeLedgerRow.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { IncomeLedgerRowVm } from "../types/incomeEditor.types";

type IncomeLedgerRowProps = {
  row: IncomeLedgerRowVm;
  monthLabel: string;
  readOnly?: boolean;
  onEdit: (row: IncomeLedgerRowVm) => void;
  onToggleActive: (row: IncomeLedgerRowVm) => void;
  onDelete: (row: IncomeLedgerRowVm) => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

type RowPill = {
  text: string;
  tone: "exception" | "info";
};

/**
 * Resolve the single visible pill for an income row.
 *
 * Rule (designer handover): a normal plan-linked active row is quiet. Only
 * the two allowed exception pills appear:
 *
 *   - `pillInactiveInMonth` for inactive rows (row does not count this month)
 *   - `pillMonthOnly`       for month-only rows (no linked plan row)
 *
 * Inactive wins over month-only when both apply — the non-counting state is
 * the dominant signal for the reader and reads in the same calm amber tone
 * the expense ledger uses for its planned-state cues. `Ändrad i {month}` is
 * intentionally not handled here — it lands in PR 6 after PR 5 exposes the
 * backend source-plan fields.
 */
function resolveRowPill(
  row: IncomeLedgerRowVm,
  monthLabel: string,
  t: (key: keyof typeof incomeLedgerRowDict.sv) => string,
): RowPill | null {
  if (row.state === "inactive") {
    return { text: t("pillInactiveInMonth"), tone: "exception" };
  }

  if (row.sourceKind === "monthOnly") {
    return {
      text: interpolate(t("pillMonthOnly"), { month: monthLabel }),
      tone: "info",
    };
  }

  return null;
}

/**
 * Resolve the secondary meta line shown under the row name.
 *
 * Salary always reads as "Månadslön efter skatt" — the user's main pay row
 * is distinct enough to warrant its own copy. Side and household rows read
 * as the calm "Återkommande" tag the designer handover specifies, matching
 * the mockup's quiet plain-text meta (never a pill).
 */
function resolveSecondaryMeta(
  row: IncomeLedgerRowVm,
  t: (key: keyof typeof incomeLedgerRowDict.sv) => string,
): string {
  return row.kind === "salary" ? t("salaryMeta") : t("recurringMeta");
}

export default function IncomeLedgerRow({
  row,
  monthLabel,
  readOnly = false,
  onEdit,
  onToggleActive,
  onDelete,
}: IncomeLedgerRowProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof incomeLedgerRowDict.sv>(key: K) =>
    tDict(key, locale, incomeLedgerRowDict);

  // Salary backend name is the stable string "Net salary"; we always display
  // the localized salary copy instead so a non-English user never sees the
  // English token. Side/household rows render the user-entered name as-is.
  const displayName =
    row.kind === "salary" ? t("salaryDisplayName") : row.name;
  // Display money is whole-krona (matches the expense ledger). The editor
  // modal keeps cents for input.
  const displayAmount = formatMoneyV2(row.amountMonthly, currency, locale, {
    fractionDigits: 0,
  });
  const countsInTotal = row.countsInMonthlyTotal;
  const pill = resolveRowPill(row, monthLabel, t);
  const secondaryMeta = resolveSecondaryMeta(row, t);

  // Row-action menu shape per designer handover:
  //   - salary → only `Redigera` (no delete, no toggle — salary is always active)
  //   - active side/household   → Redigera, Inaktivera denna månad, Ta bort från {month}
  //   - inactive side/household → Redigera, Aktivera för {month}, Ta bort från {month}
  //   - read-only month         → no actionable menu (the shared menu primitive
  //                               renders a disabled trigger automatically when
  //                               `readOnly` is true)
  const items: BudgetEditorRowActionItem[] = [];
  items.push({
    key: "edit",
    label: t("actionEdit"),
    onSelect: () => onEdit(row),
  });
  if (row.kind !== "salary") {
    items.push({
      key: row.isActive ? "deactivate" : "activate",
      label: row.isActive
        ? t("actionDeactivateInMonth")
        : interpolate(t("actionActivateForMonth"), { month: monthLabel }),
      onSelect: () => onToggleActive(row),
    });
    items.push({
      key: "delete",
      label: interpolate(t("actionDeleteFromMonth"), { month: monthLabel }),
      tone: "danger",
      onSelect: () => onDelete(row),
    });
  }

  return (
    <div
      data-testid="income-ledger-row"
      data-row-id={row.id}
      data-row-kind={row.kind}
      data-row-state={row.state}
      data-row-source-kind={row.sourceKind}
      className={cn(
        "group flex items-start gap-3 border-t border-eb-stroke/12 px-4 py-3.5 sm:px-6",
        "transition-colors hover:bg-[rgb(var(--eb-shell)/0.08)]",
        // Inactive is a valid planned state for income, not an error — keep
        // it quiet. A faint neutral wash plus muted text separates it from
        // active rows without alarming.
        countsInTotal ? "bg-transparent" : "bg-[rgb(var(--eb-shell)/0.05)]",
      )}
    >
      {/* Identity: name, plain secondary meta, and only-when-needed pill. */}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[15px] font-semibold leading-tight",
            countsInTotal ? "text-eb-text" : "text-eb-text/70",
          )}
        >
          {displayName}
        </div>

        <div className="mt-0.5 truncate text-[13px] text-eb-text/55">
          {secondaryMeta}
        </div>

        {pill ? (
          <div
            data-testid="income-ledger-row-pill"
            data-row-pill={
              row.state === "inactive" ? "inactiveInMonth" : "monthOnly"
            }
            className={cn(
              "mt-1 truncate text-[12px] tabular-nums",
              pill.tone === "exception"
                ? "text-amber-700/80"
                : "text-eb-text/50",
            )}
          >
            {pill.text}
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

        <BudgetEditorRowActionsMenu
          readOnly={readOnly}
          disabledAriaLabel={t("rowActionsDisabled")}
          openAriaLabel={t("rowActionsOpen")}
          items={items}
        />
      </div>
    </div>
  );
}
