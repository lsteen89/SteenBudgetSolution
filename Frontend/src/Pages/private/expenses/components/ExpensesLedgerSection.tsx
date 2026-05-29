import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";
import { expensesLedgerSectionDict } from "@/utils/i18n/pages/private/expenses/ExpensesLedgerSection.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useState } from "react";
import type {
  ExpenseLedgerGroupVm,
  ExpenseLedgerRowVm,
} from "../types/expenseEditor.types";
import ExpenseEditorEmptyState from "./ExpenseEditorEmptyState";
import ExpenseLedgerRow from "./ExpenseLedgerRow";
import ExpensesLedgerHeaderRow from "./ExpensesLedgerHeaderRow";

type ExpensesLedgerSectionProps = {
  group: ExpenseLedgerGroupVm;
  readOnly: boolean;
  defaultOpen?: boolean;
  onEdit: (row: ExpenseLedgerRowVm) => void;
  onPauseToggle: (row: ExpenseLedgerRowVm) => void;
  onLifecycleChange: (
    row: ExpenseLedgerRowVm,
    next: SubscriptionLifecycleStatus,
  ) => void;
  onDelete: (row: ExpenseLedgerRowVm) => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
};

export default function ExpensesLedgerSection({
  group,
  readOnly,
  defaultOpen = true,
  onEdit,
  onPauseToggle,
  onLifecycleChange,
  onDelete,
}: ExpensesLedgerSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof expensesLedgerSectionDict.sv>(key: K) =>
    tDict(key, locale, expensesLedgerSectionDict);

  const formatAmount = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 2 });

  const activeCountLabel = interpolate(
    group.activeCount === 1 ? t("activeCountOne") : t("activeCountOther"),
    { count: group.activeCount },
  );

  // Honest counts per state. A cancelled subscription must not be labelled
  // "paused", and a subscription group can mix all three. Each non-zero
  // bucket renders its own chip; the dot separator collapses naturally so we
  // don't get an empty " · " when only one chip is present.
  const inactiveCountLabels: Array<{ key: string; label: string }> = [];
  if (group.pausedCount > 0) {
    inactiveCountLabels.push({
      key: "paused",
      label: interpolate(
        group.pausedCount === 1 ? t("pausedCountOne") : t("pausedCountOther"),
        { count: group.pausedCount },
      ),
    });
  }
  if (group.cancelledCount > 0) {
    inactiveCountLabels.push({
      key: "cancelled",
      label: interpolate(
        group.cancelledCount === 1
          ? t("cancelledCountOne")
          : t("cancelledCountOther"),
        { count: group.cancelledCount },
      ),
    });
  }
  if (group.manuallyInactiveCount > 0) {
    inactiveCountLabels.push({
      key: "inactive",
      label: interpolate(
        group.manuallyInactiveCount === 1
          ? t("inactiveCountOne")
          : t("inactiveCountOther"),
        { count: group.manuallyInactiveCount },
      ),
    });
  }
  // Plan-vs-current divergence is a separate signal from active/inactive
  // counts: a row can be active *and* changed from plan. Render it as its
  // own subtle chip in the same dot-separated row so the header stays
  // scannable. The chip is gated on real source-plan data via PR 5 —
  // month-only rows never count.
  if (group.changedCount > 0) {
    inactiveCountLabels.push({
      key: "changed",
      label: interpolate(
        group.changedCount === 1
          ? t("changedCountOne")
          : t("changedCountOther"),
        { count: group.changedCount },
      ),
    });
  }

  const largestLabel =
    group.largestActiveRow && group.activeCount > 1
      ? interpolate(t("largestItem"), {
          name: group.largestActiveRow.name,
          amount: formatAmount(group.largestActiveRow.amountMonthly),
        })
      : null;

  return (
    <section
      data-testid={`expenses-ledger-group-${group.key}`}
      data-active-count={group.activeCount}
      data-inactive-count={group.inactiveCount}
      data-month-only-count={group.monthOnlyCount}
      data-changed-count={group.changedCount}
      className="rounded-[2rem] border border-white/28 bg-white/12 p-1.5 shadow-[0_10px_30px_rgba(21,39,81,0.04)] backdrop-blur-[8px]"
    >
      <div className="overflow-hidden rounded-[1.6rem] border border-eb-stroke/10 bg-[rgb(var(--eb-surface)/0.68)]">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/10 sm:px-6 sm:py-6"
          aria-expanded={open}
        >
          <div className="min-w-0">
            <div className="text-[1.05rem] font-bold text-eb-text">
              {group.title}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-eb-text/55">
              <span>{activeCountLabel}</span>
              {inactiveCountLabels.map((entry) => (
                <span
                  key={entry.key}
                  className="contents"
                  data-testid={`expenses-ledger-group-${group.key}-${entry.key}-count`}
                >
                  <span aria-hidden="true" className="text-eb-text/30">
                    ·
                  </span>
                  <span className="text-eb-text/55">{entry.label}</span>
                </span>
              ))}
            </div>

            {largestLabel ? (
              <div
                data-testid={`expenses-ledger-group-${group.key}-largest`}
                className="mt-1.5 truncate text-[12px] text-eb-text/45"
              >
                {largestLabel}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.16em] text-eb-text/38">
                {t("total")}
              </div>
              <div
                data-testid={`expenses-ledger-group-${group.key}-total`}
                className="text-base font-semibold tabular-nums text-eb-text"
              >
                {formatAmount(group.activeTotal)}
              </div>
            </div>

            <div
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border border-eb-stroke/14 bg-white/10 text-eb-text/55 transition-all",
                "hover:bg-white/18",
                open ? "rotate-180" : "",
              )}
            >
              ˅
            </div>
          </div>
        </button>

        {open ? (
          <>
            <div className="border-t border-eb-stroke/10 bg-[rgb(var(--eb-shell)/0.10)]">
              <ExpensesLedgerHeaderRow />
            </div>

            {group.rows.length === 0 ? (
              <ExpenseEditorEmptyState text={t("empty")} />
            ) : group.activeRows.length === 0 ? (
              // All rows are inactive/paused/cancelled. Show a calm empty-state
              // for the active region, then render the inactive rows below the
              // sublabel divider for transparency.
              <>
                <ExpenseEditorEmptyState text={t("emptyActive")} />
                <InactiveDivider label={t("inactiveSublabel")} />
                {group.inactiveRows.map((row) => (
                  <ExpenseLedgerRow
                    key={row.id}
                    row={row}
                    readOnly={readOnly}
                    onEdit={onEdit}
                    onPauseToggle={onPauseToggle}
                    onLifecycleChange={onLifecycleChange}
                    onDelete={onDelete}
                  />
                ))}
              </>
            ) : (
              <>
                {group.activeRows.map((row) => (
                  <ExpenseLedgerRow
                    key={row.id}
                    row={row}
                    readOnly={readOnly}
                    onEdit={onEdit}
                    onPauseToggle={onPauseToggle}
                    onLifecycleChange={onLifecycleChange}
                    onDelete={onDelete}
                  />
                ))}

                {group.inactiveRows.length > 0 ? (
                  <>
                    <InactiveDivider label={t("inactiveSublabel")} />
                    {group.inactiveRows.map((row) => (
                      <ExpenseLedgerRow
                        key={row.id}
                        row={row}
                        readOnly={readOnly}
                        onEdit={onEdit}
                        onPauseToggle={onPauseToggle}
                        // Mirror the active-rows branch above. Inactive
                        // subscription rows (paused / cancelled) live in
                        // this section and still expose lifecycle actions
                        // in the row menu (e.g. "Reactivate"). Dropping
                        // `onLifecycleChange` here left the menu item's
                        // handler calling `undefined(...)`, which threw
                        // and prevented Radix from closing the menu, so
                        // the user could open the resume menu and click
                        // it but the row never reactivated.
                        onLifecycleChange={onLifecycleChange}
                        onDelete={onDelete}
                      />
                    ))}
                  </>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

function InactiveDivider({ label }: { label: string }) {
  return (
    <div
      data-testid="expenses-ledger-inactive-divider"
      className={cn(
        "border-t border-eb-stroke/15 bg-[rgb(var(--eb-shell)/0.08)]",
        "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-eb-text/50 sm:px-6",
      )}
    >
      {label}
    </div>
  );
}
