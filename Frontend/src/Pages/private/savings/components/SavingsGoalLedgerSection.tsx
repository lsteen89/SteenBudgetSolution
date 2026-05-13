import BudgetEditorRowActionsMenu from "@/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useState } from "react";

type SavingsGoalLedgerSectionProps = {
  rows: BudgetMonthSavingsGoalEditorRowDto[];
  total: number;
  readOnly: boolean;
  onEdit: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
};

const ledgerDesktopGridClass =
  "sm:grid sm:grid-cols-[minmax(0,1.8fr)_minmax(180px,1fr)_140px_52px] sm:items-center sm:gap-x-5";

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function SavingsGoalLedgerSection({
  rows,
  total,
  readOnly,
  onEdit,
}: SavingsGoalLedgerSectionProps) {
  const [open, setOpen] = useState(true);
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const rowsCountLabel = interpolate(
    rows.length === 1 ? t("rowsCountOne") : t("rowsCountOther"),
    { count: rows.length },
  );

  return (
    <section
      data-testid="savings-goal-ledger"
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
              {t("sectionTitle")}
            </div>
            <div className="mt-1 text-sm text-eb-text/55">{rowsCountLabel}</div>
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
                <div>{t("goal")}</div>
                <div>{t("progress")}</div>
                <div className="text-right">{t("monthlyAmount")}</div>
                <div aria-hidden="true" />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="border-t border-eb-stroke/12 px-5 py-8 text-center text-sm text-eb-text/55">
                {t("empty")}
              </div>
            ) : (
              rows.map((row) => (
                <SavingsGoalLedgerRow
                  key={row.id}
                  row={row}
                  readOnly={readOnly}
                  onEdit={onEdit}
                />
              ))
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

function SavingsGoalLedgerRow({
  row,
  readOnly,
  onEdit,
}: {
  row: BudgetMonthSavingsGoalEditorRowDto;
  readOnly: boolean;
  onEdit: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
}) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const displayAmount = formatMoneyV2(row.monthlyContribution, currency, locale, {
    fractionDigits: 2,
  });
  const savedLabel = formatProgressLabel(row, currency, locale, t("targetOf"));
  const targetDateLabel = formatTargetDate(row.targetDate, locale);

  return (
    <div
      className={cn(
        "border-t border-eb-stroke/12 px-4 py-4 sm:px-6",
        "transition-colors hover:bg-[rgb(var(--eb-shell)/0.08)]",
      )}
      data-testid="savings-goal-row"
    >
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-eb-text">
              {row.name}
            </div>
            {savedLabel ? (
              <div className="mt-1 text-sm text-eb-text/58">{savedLabel}</div>
            ) : null}
            {targetDateLabel ? (
              <div className="mt-1 text-xs text-eb-text/50">
                {t("targetDate")} · {targetDateLabel}
              </div>
            ) : null}
            {row.isMonthOnly ? (
              <div className="mt-2 inline-flex rounded-full border border-eb-stroke/18 bg-white/50 px-2 py-0.5 text-[11px] font-semibold text-eb-text/45">
                {t("monthOnly")}
              </div>
            ) : null}
          </div>

          <div className="flex items-start gap-2 pl-2">
            <div className="whitespace-nowrap pt-0.5 text-right text-sm font-bold tabular-nums text-eb-text">
              {displayAmount}
            </div>
            <SavingsRowActions
              row={row}
              readOnly={readOnly}
              onEdit={onEdit}
            />
          </div>
        </div>
      </div>

      <div className={cn("hidden sm:grid", ledgerDesktopGridClass)}>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-eb-text">
            {row.name}
          </div>
          {targetDateLabel ? (
            <div className="mt-0.5 text-xs text-eb-text/50">
              {t("targetDate")} · {targetDateLabel}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 truncate text-sm text-eb-text/58">
          {savedLabel ?? ""}
          {row.isMonthOnly ? (
            <span className="ml-2 rounded-full border border-eb-stroke/18 bg-white/50 px-2 py-0.5 text-[11px] font-semibold text-eb-text/45">
              {t("monthOnly")}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 text-right text-sm font-bold tabular-nums text-eb-text">
          <span className="block truncate">{displayAmount}</span>
        </div>

        <div className="flex justify-end">
          <SavingsRowActions
            row={row}
            readOnly={readOnly}
            onEdit={onEdit}
          />
        </div>
      </div>
    </div>
  );
}

function SavingsRowActions({
  row,
  readOnly,
  onEdit,
}: {
  row: BudgetMonthSavingsGoalEditorRowDto;
  readOnly: boolean;
  onEdit: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
}) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

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
      ]}
    />
  );
}

function formatProgressLabel(
  row: BudgetMonthSavingsGoalEditorRowDto,
  currency: Parameters<typeof formatMoneyV2>[1],
  locale: Parameters<typeof formatMoneyV2>[2],
  ofLabel: string,
): string | null {
  if (row.amountSaved == null && row.targetAmount == null) return null;
  const saved = row.amountSaved ?? 0;
  if (row.targetAmount == null) {
    return formatMoneyV2(saved, currency, locale, { fractionDigits: 2 });
  }

  return `${formatMoneyV2(saved, currency, locale, {
    fractionDigits: 2,
  })} ${ofLabel} ${formatMoneyV2(row.targetAmount, currency, locale, {
    fractionDigits: 2,
  })}`;
}

function formatTargetDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return null;
  }
}
