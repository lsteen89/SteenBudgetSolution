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

type RowPillKey = "inactiveInMonth" | "monthOnly" | "changedInMonth";

type RowPill = {
  key: RowPillKey;
  text: string;
  tone: "exception" | "info" | "change";
};

/**
 * Resolve the single visible pill for an income row.
 *
 * Rule (designer handover): a normal plan-linked active row is quiet. Only
 * the three allowed exception pills appear, with this exact priority when
 * multiple states apply (PR 6, "Row State Priority"):
 *
 *   1. `pillInactiveInMonth` — row does not count this month. The dominant
 *      reader signal: the row is silent in the total, so the exception goes
 *      first and the amber "exception" tone matches the expense ledger.
 *   2. `pillMonthOnly` — no linked plan row. Quiet info tone, since
 *      month-only is a normal life shape, not a discrepancy.
 *   3. `pillChangedInMonth` — plan-linked row whose amount/name/active state
 *      diverged from the plan row. Uses a calm "change" tone (blue/navy,
 *      via the eb-accent token) — not red. Income deltas are never styled
 *      as destructive; red is reserved for actions like delete.
 *
 * `Ändrad i {month}` only renders when the backend's source-plan fields say
 * so — see `isIncomeRowChangedFromPlan` in `buildIncomeLedgerGroups`. The
 * frontend never invents the delta.
 */
function resolveRowPill(
  row: IncomeLedgerRowVm,
  monthLabel: string,
  t: (key: keyof typeof incomeLedgerRowDict.sv) => string,
): RowPill | null {
  if (row.state === "inactive") {
    return {
      key: "inactiveInMonth",
      text: t("pillInactiveInMonth"),
      tone: "exception",
    };
  }

  if (row.sourceKind === "monthOnly") {
    return {
      key: "monthOnly",
      text: interpolate(t("pillMonthOnly"), { month: monthLabel }),
      tone: "info",
    };
  }

  if (row.isChangedFromPlan) {
    return {
      key: "changedInMonth",
      text: interpolate(t("pillChangedInMonth"), { month: monthLabel }),
      tone: "change",
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
            data-row-pill={pill.key}
            className={cn(
              "mt-1 truncate text-[12px] tabular-nums",
              // Calm amber for the dominant "not counting" exception, soft
              // muted text for normal month-only context, and a navy/accent
              // tint for "changed in {month}". The change tone deliberately
              // avoids red — income deltas are not destructive, and the
              // handover reserves red strictly for actions like delete.
              pill.tone === "exception" && "text-amber-700/80",
              pill.tone === "info" && "text-eb-text/50",
              pill.tone === "change" &&
                "text-[rgb(var(--eb-accent)/0.95)]",
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

        {/*
          Read-only months must expose no edit affordances on the UI side
          (not just rely on backend rejection) — see the income editor
          handover. The shared menu primitive's `readOnly` mode still
          renders a disabled trigger button, which still looks like an
          affordance. For income rows we omit the menu entirely when
          read-only so the row reads as plain information.
        */}
        {readOnly ? null : (
          <BudgetEditorRowActionsMenu
            disabledAriaLabel={t("rowActionsDisabled")}
            openAriaLabel={t("rowActionsOpen")}
            items={items}
          />
        )}
      </div>
    </div>
  );
}
