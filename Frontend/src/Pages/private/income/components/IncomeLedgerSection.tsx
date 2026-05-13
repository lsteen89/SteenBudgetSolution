import BudgetEditorRowActionsMenu from "@/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetMonthIncomeItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { incomeEditorPageDict } from "@/utils/i18n/pages/private/income/IncomeEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useState } from "react";

type IncomeLedgerSectionProps = {
  rows: BudgetMonthIncomeItemEditorRowDto[];
  total: number;
  readOnly: boolean;
  onEdit: (row: BudgetMonthIncomeItemEditorRowDto) => void;
  onDelete: (row: BudgetMonthIncomeItemEditorRowDto) => void;
};

const ledgerDesktopGridClass =
  "sm:grid sm:grid-cols-[minmax(0,1.8fr)_minmax(180px,1fr)_140px_52px] sm:items-center sm:gap-x-5";

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function IncomeLedgerSection({
  rows,
  total,
  readOnly,
  onEdit,
  onDelete,
}: IncomeLedgerSectionProps) {
  const [open, setOpen] = useState(true);
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof incomeEditorPageDict.sv>(key: K) =>
    tDict(key, locale, incomeEditorPageDict);
  const rowsCountLabel = interpolate(
    rows.length === 1 ? t("rowsCountOne") : t("rowsCountOther"),
    { count: rows.length },
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
              {t("title")}
            </div>
            <div className="mt-1 text-sm text-eb-text/55">
              {rowsCountLabel}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.16em] text-eb-text/38">
                {t("total")}
              </div>
              <div className="text-base font-semibold tabular-nums text-eb-text">
                {formatMoneyV2(total, currency, locale, {
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
              <div
                className={[
                  "hidden sm:grid",
                  ledgerDesktopGridClass,
                  "px-6 py-3 text-sm text-eb-text/60",
                ].join(" ")}
              >
                <div>{t("income")}</div>
                <div>{t("type")}</div>
                <div className="text-right">{t("amount")}</div>
                <div aria-hidden="true" />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="border-t border-eb-stroke/12 px-5 py-8 text-center text-sm text-eb-text/55">
                {t("empty")}
              </div>
            ) : (
              rows.map((row) => (
                <IncomeLedgerRow
                  key={row.id}
                  row={row}
                  readOnly={readOnly}
                  onEdit={onEdit}
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

function IncomeLedgerRow({
  row,
  readOnly,
  onEdit,
  onDelete,
}: {
  row: BudgetMonthIncomeItemEditorRowDto;
  readOnly: boolean;
  onEdit: (row: BudgetMonthIncomeItemEditorRowDto) => void;
  onDelete: (row: BudgetMonthIncomeItemEditorRowDto) => void;
}) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof incomeEditorPageDict.sv>(key: K) =>
    tDict(key, locale, incomeEditorPageDict);
  const displayAmount = formatMoneyV2(row.amountMonthly, currency, locale, {
    fractionDigits: 2,
  });
  const displayName = row.kind === "salary" ? t("salary") : row.name;
  const typeLabel = t(row.kind);
  const canDelete = row.kind !== "salary";

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
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-[15px] font-semibold",
                row.isActive ? "text-eb-text" : "text-eb-text/72",
              )}
            >
              {displayName}
            </div>

            <div
              className={cn(
                "mt-1 text-sm",
                row.isActive ? "text-eb-text/58" : "text-eb-text/62",
              )}
            >
              {typeLabel}
            </div>

            {!row.isActive ? (
              <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                {t("paused")}
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

            <IncomeRowActions
              row={row}
              readOnly={readOnly}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>

      <div className={cn("hidden sm:grid", ledgerDesktopGridClass)}>
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-sm font-semibold",
              row.isActive ? "text-eb-text" : "text-eb-text/72",
            )}
          >
            {displayName}
          </div>

          {!row.isActive ? (
            <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              {t("paused")}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "min-w-0 truncate text-sm",
            row.isActive ? "text-eb-text/58" : "text-eb-text/62",
          )}
        >
          {typeLabel}
          {row.isMonthOnly ? (
            <span className="ml-2 rounded-full border border-eb-stroke/18 bg-white/50 px-2 py-0.5 text-[11px] font-semibold text-eb-text/45">
              {t("monthOnly")}
            </span>
          ) : null}
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
          <IncomeRowActions
            row={row}
            readOnly={readOnly}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

function IncomeRowActions({
  row,
  readOnly,
  canDelete,
  onEdit,
  onDelete,
}: {
  row: BudgetMonthIncomeItemEditorRowDto;
  readOnly: boolean;
  canDelete: boolean;
  onEdit: (row: BudgetMonthIncomeItemEditorRowDto) => void;
  onDelete: (row: BudgetMonthIncomeItemEditorRowDto) => void;
}) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof incomeEditorPageDict.sv>(key: K) =>
    tDict(key, locale, incomeEditorPageDict);

  return (
    <BudgetEditorRowActionsMenu
      readOnly={readOnly}
      disabledAriaLabel={t("rowActionsDisabled")}
      openAriaLabel={t("rowActionsOpen")}
      items={[
        {
          key: "edit",
          label: t("edit"),
          onSelect: () => onEdit(row),
        },
        ...(canDelete
          ? [
              {
                key: "delete",
                label: t("delete"),
                tone: "danger" as const,
                onSelect: () => onDelete(row),
              },
            ]
          : []),
      ]}
    />
  );
}
