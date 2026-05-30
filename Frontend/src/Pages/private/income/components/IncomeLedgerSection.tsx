import BudgetEditorEmptyRow from "@/components/molecules/forms/budgetEditor/BudgetEditorEmptyRow";
import BudgetEditorInactiveDivider from "@/components/molecules/forms/budgetEditor/BudgetEditorInactiveDivider";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { incomeLedgerSectionDict } from "@/utils/i18n/pages/private/income/IncomeLedgerSection.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useState } from "react";
import type {
  IncomeLedgerGroupKey,
  IncomeLedgerGroupVm,
  IncomeLedgerRowVm,
} from "../types/incomeEditor.types";
import IncomeLedgerRow from "./IncomeLedgerRow";

type IncomeLedgerSectionProps = {
  group: IncomeLedgerGroupVm;
  monthLabel: string;
  readOnly: boolean;
  defaultOpen?: boolean;
  onEdit: (row: IncomeLedgerRowVm) => void;
  onToggleActive: (row: IncomeLedgerRowVm) => void;
  onDelete: (row: IncomeLedgerRowVm) => void;
  /** Open the create drawer with this group's kind preselected. */
  onCreateInGroup: (group: IncomeLedgerGroupVm) => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

/**
 * Resolve the locked title + description for a group.
 *
 * Titles and descriptions are pinned by the designer handover. Sidoinkomst
 * (not Sidointäkt) is enforced by the dictionary — we never assemble the
 * label from `kind` directly.
 */
function resolveGroupCopy(
  groupKey: IncomeLedgerGroupKey,
  t: (key: keyof typeof incomeLedgerSectionDict.sv) => string,
): { title: string; description: string } {
  switch (groupKey) {
    case "salary":
      return { title: t("salaryTitle"), description: t("salaryDescription") };
    case "householdMember":
      return {
        title: t("householdMemberTitle"),
        description: t("householdMemberDescription"),
      };
    case "sideHustle":
      return {
        title: t("sideHustleTitle"),
        description: t("sideHustleDescription"),
      };
  }
}

export default function IncomeLedgerSection({
  group,
  monthLabel,
  readOnly,
  defaultOpen = true,
  onEdit,
  onToggleActive,
  onDelete,
  onCreateInGroup,
}: IncomeLedgerSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof incomeLedgerSectionDict.sv>(key: K) =>
    tDict(key, locale, incomeLedgerSectionDict);

  const { title, description } = resolveGroupCopy(group.key, t);

  // Group totals match the backend dashboard counting rule (active +
  // non-deleted). Inactive rows are visible below the divider but never
  // pulled into this number.
  const formatAmount = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  const activeCountLabel = interpolate(
    group.activeCount === 1 ? t("activeCountOne") : t("activeCountOther"),
    { count: group.activeCount },
  );
  const inactiveCountLabel =
    group.inactiveCount > 0
      ? interpolate(
          group.inactiveCount === 1
            ? t("inactiveCountOne")
            : t("inactiveCountOther"),
          { count: group.inactiveCount },
        )
      : null;

  const inactiveSublabel = interpolate(t("inactiveSublabel"), {
    month: monthLabel,
  });

  // Empty-state copy is intentionally per-group: salary's empty state is rare
  // (the materializer always seeds a salary row) but it should read calmly
  // rather than offering a "+ Add" affordance the user cannot use.
  const emptyText = group.key === "salary" ? t("emptySalary") : t("empty");
  const emptyActiveText = t("emptyActive");

  const showGroupAdd = !readOnly && group.canCreateInGroup;

  return (
    <section
      data-testid={`income-ledger-group-${group.key}`}
      data-active-count={group.activeCount}
      data-inactive-count={group.inactiveCount}
      data-month-only-count={group.monthOnlyCount}
      // scroll-margin-top keeps the group header (and its add/collapse
      // controls) clear of the sticky app header (h-16) whenever a group is
      // scrolled or focused into view, so the controls are never tucked under
      // the header/cloud layer. Mirrors the expenses ledger.
      className="scroll-mt-20 rounded-3xl border border-white/24 bg-white/10 p-1.5 shadow-[0_4px_16px_rgba(21,39,81,0.03)] backdrop-blur-[6px] sm:scroll-mt-24"
    >
      <div className="overflow-hidden rounded-[1.3rem] border border-eb-stroke/10 bg-[rgb(var(--eb-surface)/0.62)]">
        {/* Header is a flex row of two regions, not one big button, so the
          group-level add action can live in the header as a sibling control
          (a button cannot be nested inside another button). The title block
          and the chevron both toggle the group. */}
        <div className="flex w-full items-stretch gap-1">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex min-w-0 flex-1 items-start px-5 py-5 text-left transition hover:bg-white/10 sm:px-6 sm:py-6"
            aria-expanded={open}
          >
            <div className="min-w-0">
              <div className="text-[1.05rem] font-bold text-eb-text">
                {title}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-eb-text/55">
                <span>{activeCountLabel}</span>
                {inactiveCountLabel ? (
                  <>
                    <span aria-hidden="true" className="text-eb-text/30">
                      ·
                    </span>
                    <span
                      data-testid={`income-ledger-group-${group.key}-inactive-count`}
                    >
                      {inactiveCountLabel}
                    </span>
                  </>
                ) : null}
              </div>

              <div className="mt-1 truncate text-[12px] text-eb-text/55">
                {description}
              </div>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2 py-5 pl-1 pr-3 sm:gap-3 sm:py-6 sm:pr-6">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.16em] text-eb-text/38">
                {t("perMonth")}
              </div>
              <div
                data-testid={`income-ledger-group-${group.key}-total`}
                className="text-base font-semibold tabular-nums text-eb-text"
              >
                {formatAmount(group.activeTotal)}
              </div>
            </div>

            {showGroupAdd ? (
              // Secondary add, scoped to this group's kind. Quiet by design —
              // clearly subordinate to the hero's primary CTA. Salary never
              // renders this button (canCreateInGroup is false).
              <button
                type="button"
                data-testid={`income-ledger-group-${group.key}-add`}
                onClick={() => onCreateInGroup(group)}
                aria-label={`${t("addInGroup")} · ${title}`}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 sm:px-3",
                  "border border-eb-stroke/20 bg-white/30 text-[13px] font-medium text-eb-text/65 transition",
                  "hover:bg-white/55 hover:text-eb-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--eb-accent)/0.25)]",
                )}
              >
                <span
                  aria-hidden="true"
                  className="text-[15px] leading-none text-eb-text/45"
                >
                  +
                </span>
                <span className="hidden sm:inline">{t("addInGroup")}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              aria-label={t("toggleGroup")}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-eb-stroke/14 bg-white/10 text-eb-text/55 transition-all",
                "hover:bg-white/18",
                open ? "rotate-180" : "",
              )}
            >
              ˅
            </button>
          </div>
        </div>

        {open ? (
          <>
            <div className="border-t border-eb-stroke/10" />

            {group.rows.length === 0 ? (
              <BudgetEditorEmptyRow text={emptyText} />
            ) : group.activeRows.length === 0 ? (
              // Group exists in some shape but every row is inactive. Show
              // the calm empty-state for the active region, then render the
              // inactive subsection below the divider for transparency.
              <>
                <BudgetEditorEmptyRow text={emptyActiveText} />
                <BudgetEditorInactiveDivider
                  label={inactiveSublabel}
                  testId={`income-ledger-group-${group.key}-inactive-divider`}
                />
                {group.inactiveRows.map((row) => (
                  <IncomeLedgerRow
                    key={row.id}
                    row={row}
                    monthLabel={monthLabel}
                    readOnly={readOnly}
                    onEdit={onEdit}
                    onToggleActive={onToggleActive}
                    onDelete={onDelete}
                  />
                ))}
              </>
            ) : (
              <>
                {group.activeRows.map((row) => (
                  <IncomeLedgerRow
                    key={row.id}
                    row={row}
                    monthLabel={monthLabel}
                    readOnly={readOnly}
                    onEdit={onEdit}
                    onToggleActive={onToggleActive}
                    onDelete={onDelete}
                  />
                ))}

                {group.inactiveRows.length > 0 ? (
                  <>
                    <BudgetEditorInactiveDivider
                      label={inactiveSublabel}
                      testId={`income-ledger-group-${group.key}-inactive-divider`}
                    />
                    {group.inactiveRows.map((row) => (
                      <IncomeLedgerRow
                        key={row.id}
                        row={row}
                        monthLabel={monthLabel}
                        readOnly={readOnly}
                        onEdit={onEdit}
                        onToggleActive={onToggleActive}
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
