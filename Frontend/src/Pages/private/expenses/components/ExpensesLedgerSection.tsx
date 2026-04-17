import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
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
  onDelete,
}: ExpensesLedgerSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof expensesLedgerSectionDict.sv>(key: K) =>
    tDict(key, locale, expensesLedgerSectionDict);

  const rowsCountLabel = interpolate(
    group.rows.length === 1 ? t("rowsCountOne") : t("rowsCountOther"),
    { count: group.rows.length },
  );

  return (
    <section className="rounded-[2rem] border border-white/28 bg-white/12 p-1.5 shadow-[0_10px_30px_rgba(21,39,81,0.04)] backdrop-blur-[8px]">
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
            <div className="mt-1 text-sm text-eb-text/55">{rowsCountLabel}</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.16em] text-eb-text/38">
                {t("total")}
              </div>
              <div className="text-base font-semibold tabular-nums text-eb-text">
                {formatMoneyV2(group.total, currency, locale, {
                  fractionDigits: 2,
                })}
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
            ) : (
              group.rows.map((row) => (
                <ExpenseLedgerRow
                  key={row.id}
                  row={row}
                  readOnly={readOnly}
                  onEdit={onEdit}
                  onPauseToggle={onPauseToggle}
                  onDelete={onDelete}
                />
              ))
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
