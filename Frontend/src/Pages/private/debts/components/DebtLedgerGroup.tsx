import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type {
  DebtEditorRowDto,
  DebtEditorGroup,
} from "@/types/budget/DebtEditorDto";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { DebtGroupCopy } from "../utils/debtEditorGroups";
import DebtLedgerRow from "./DebtLedgerRow";
import type { DebtLifecycleAction } from "./DebtLifecycleConfirmDialog";

type DebtLedgerGroupProps = {
  copy: DebtGroupCopy;
  rows: readonly DebtEditorRowDto[];
  yearMonthLabel: string;
  /** Page-level read-only flag (closed/skipped month). */
  readOnly: boolean;
  /** Wired in PR 6 for the planned-payment action. */
  onEditPayment: (row: DebtEditorRowDto) => void;
  /**
   * Debt PR 7 — passed straight through to each row so the edit-details
   * kebab item appears when the parent has wired the drawer.
   */
  onEditDetails?: (row: DebtEditorRowDto) => void;
  /**
   * Debt PR 8 — passed straight through to each row so the lifecycle /
   * participation kebab items appear when the parent has wired the dialog.
   */
  onLifecycleAction?: (row: DebtEditorRowDto, action: DebtLifecycleAction) => void;
  /**
   * Debt PR 9 — passed through so the `Uppdatera saldo` and repayment-progress
   * kebab items appear when the parent has wired their flows.
   */
  onUpdateBalance?: (row: DebtEditorRowDto) => void;
  onViewProgress?: (row: DebtEditorRowDto) => void;
  /**
   * Override the default opening state. Used by the page to keep the archived
   * group collapsed on first render.
   */
  defaultOpen?: boolean;
};

const interpolate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function DebtLedgerGroup({
  copy,
  rows,
  yearMonthLabel,
  readOnly,
  onEditPayment,
  onEditDetails,
  onLifecycleAction,
  onUpdateBalance,
  onViewProgress,
  defaultOpen,
}: DebtLedgerGroupProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, debtsEditorPageDict);

  const collapsible = copy.group === "archived";
  const [open, setOpen] = useState(defaultOpen ?? !collapsible);

  const count = rows.length;
  if (count === 0) return null;

  const countLabel = interpolate(
    count === 1 ? t(copy.countOneKey) : t(copy.countOtherKey),
    { count },
  );

  const fmt0 = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  const totalPlanned = rows.reduce((sum, row) => sum + row.monthlyPayment, 0);
  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0);

  return (
    <section
      data-testid={`debt-ledger-group-${copy.group}`}
      data-group={copy.group}
      className={cn(
        "rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-1.5 shadow-[0_10px_30px_rgba(21,39,81,0.04)] backdrop-blur-[6px]",
        copy.group === "paid" || copy.group === "archived" ? "opacity-95" : "",
      )}
    >
      <div className="overflow-hidden rounded-[1.45rem] border border-eb-stroke/12 bg-[rgb(var(--eb-surface)/0.7)]">
        <header
          data-testid={`debt-ledger-group-${copy.group}-head`}
          className={cn(
            "flex w-full flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6",
            collapsible ? "cursor-pointer transition hover:bg-white/15" : "",
          )}
          onClick={collapsible ? () => setOpen((prev) => !prev) : undefined}
          role={collapsible ? "button" : undefined}
          aria-expanded={collapsible ? open : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={
            collapsible
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpen((prev) => !prev);
                  }
                }
              : undefined
          }
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <GroupIcon group={copy.group} />
              <h2 className="m-0 text-[15px] font-bold text-eb-text">
                {t(copy.titleKey)}
              </h2>
              <span className="text-[12.5px] text-eb-text/55">{countLabel}</span>
            </div>
            <p className="mt-1 text-[12.5px] text-eb-text/55">
              {t(copy.insightKey)}
            </p>
          </div>

          <GroupTotals
            group={copy.group}
            collapsible={collapsible}
            open={open}
            plannedLabel={t("groupTotalPlannedLabel")}
            notIncludedLabel={t("groupTotalNotIncludedLabel")}
            remainingLabel={t("groupTotalRemainingLabel")}
            paidSummary={t("groupPaidSummary")}
            expandLabel={t("groupArchivedExpand")}
            collapseLabel={t("groupArchivedCollapse")}
            plannedText={fmt0(totalPlanned)}
            balanceText={fmt0(totalBalance)}
          />
        </header>

        {open ? (
          <>
            {copy.group !== "paid" && copy.group !== "archived" ? (
              <div
                className={cn(
                  "hidden border-t border-eb-stroke/12 bg-[rgb(var(--eb-shell)/0.10)] px-5 py-2.5 sm:block sm:px-6",
                )}
              >
                <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(120px,1fr)_minmax(120px,1fr)_56px] gap-x-5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-eb-text/45">
                  <span />
                  <span>{t("rowsColBalance")}</span>
                  <span>{t("rowsColPayment")}</span>
                  <span />
                </div>
              </div>
            ) : null}
            <div data-testid={`debt-ledger-group-${copy.group}-rows`}>
              {rows.map((row) => (
                <DebtLedgerRow
                  key={row.id}
                  row={row}
                  yearMonthLabel={yearMonthLabel}
                  readOnly={readOnly}
                  onEditPayment={onEditPayment}
                  onEditDetails={onEditDetails}
                  onLifecycleAction={onLifecycleAction}
                  onUpdateBalance={onUpdateBalance}
                  onViewProgress={onViewProgress}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function GroupTotals({
  group,
  collapsible,
  open,
  plannedLabel,
  notIncludedLabel,
  remainingLabel,
  paidSummary,
  expandLabel,
  collapseLabel,
  plannedText,
  balanceText,
}: {
  group: DebtEditorGroup;
  collapsible: boolean;
  open: boolean;
  plannedLabel: string;
  notIncludedLabel: string;
  remainingLabel: string;
  paidSummary: string;
  expandLabel: string;
  collapseLabel: string;
  plannedText: string;
  balanceText: string;
}) {
  if (collapsible) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-eb-text/55">
        <span>{open ? collapseLabel : expandLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open ? "rotate-180" : "",
          )}
          strokeWidth={2.2}
        />
      </div>
    );
  }

  if (group === "paid") {
    return (
      <div className="text-right">
        <div className="text-[14px] font-bold text-eb-text/60">
          {paidSummary}
        </div>
      </div>
    );
  }

  if (group === "skipped") {
    return (
      <div className="text-right">
        <div className="text-[14px] font-extrabold tabular-nums text-eb-text">
          0
          <span className="ml-1 align-middle text-[11.5px] font-bold text-eb-text/55">
            {notIncludedLabel}
          </span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-eb-text/60">
          {remainingLabel} <strong className="text-eb-text">{balanceText}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="text-[15px] font-extrabold tabular-nums text-eb-text">
        {plannedText}
      </div>
      <div className="mt-0.5 text-[11.5px] text-eb-text/55">{plannedLabel}</div>
      <div className="mt-0.5 text-[11.5px] text-eb-text/60">
        {remainingLabel} <strong className="text-eb-text">{balanceText}</strong>
      </div>
    </div>
  );
}

function GroupIcon({ group }: { group: DebtEditorGroup }): ReactNode {
  const common = "h-4 w-4 text-eb-text/65";
  if (group === "active") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
        <path
          d="M5 12h14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (group === "skipped") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
        <path
          d="M6 4h2v16H6zM16 4l-8 8 8 8z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (group === "paid") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // archived
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true">
      <path
        d="M3 7h18M5 7l1 13h12l1-13M9 11v6M15 11v6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
