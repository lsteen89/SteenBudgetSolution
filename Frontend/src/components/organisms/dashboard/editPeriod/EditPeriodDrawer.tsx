import React, { useEffect, useRef, useState } from "react";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types/i18n/currency";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { quickEditTabsDict } from "@/utils/i18n/pages/private/dashboard/cards/period/quickEditTabs.i18n";
import { tDict } from "@/utils/i18n/translate";

import DebtsPanel from "./debts/DebtsPanel";
import EditPeriodHeader from "./EditPeriodHeader";
import ExpensesPanel from "./expense/ExpensesPanel";
import IncomePanel from "./income/IncomePanel";
import QuickEditTabs, {
  QUICK_EDIT_PANEL_ID,
  QUICK_EDIT_TAB_ID,
  QUICK_EDIT_TAB_ORDER,
  type QuickEditTab,
} from "./QuickEditTabs";
import SavingsPanel from "./savings/SavingsPanel";

type EditPeriodDrawerProps = {
  open: boolean;
  yearMonth: string;
  periodLabel: string;
  periodDateRangeLabel: string;
  /**
   * Tab to focus when the drawer opens. The user can then switch tabs from
   * inside the drawer. Dashboard quick-action buttons still drive the initial
   * tab through this prop.
   */
  panel?: QuickEditTab;
  /**
   * Dashboard six-term equation for the active month. Used by the shared
   * Quick Edit footer to render `free this month → projected` while the
   * user edits the active tab. Optional so existing callers that have not
   * been migrated keep working (footer falls back to legacy summary copy).
   */
  dashboardTerms?: DashboardTerms;
  /**
   * Currency for the projection preview. Required when `dashboardTerms` is
   * provided.
   */
  currency?: CurrencyCode;
  onClose: () => void;
};

const TITLE_KEY_FOR_TAB: Record<
  QuickEditTab,
  "title" | "incomeTitle" | "savingsTitle" | "debtsTitle"
> = {
  expenses: "title",
  income: "incomeTitle",
  savings: "savingsTitle",
  debts: "debtsTitle",
};

/**
 * Modal-style drawer that hosts the Quick Edit module. The shell owns
 * overlay, escape-close behavior, body scroll lock, header, the tab strip,
 * and which domain panels are mounted. Each domain panel still owns its
 * own query, draft state, validation, and save call.
 *
 * Cross-domain save is intentionally not supported in this PR: each panel
 * saves its own domain only. The "saving applies to the active tab" copy
 * under the tab strip makes that contract explicit to the user.
 */
const EditPeriodDrawer: React.FC<EditPeriodDrawerProps> = ({
  open,
  yearMonth,
  periodLabel,
  periodDateRangeLabel,
  panel = "expenses",
  dashboardTerms,
  currency,
  onClose,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const locale = useAppLocale();

  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);
  const tTabs = <K extends keyof typeof quickEditTabsDict.sv>(key: K) =>
    tDict(key, locale, quickEditTabsDict);

  // Tab the user is currently looking at inside the drawer.
  const [activeTab, setActiveTab] = useState<QuickEditTab>(panel);

  // Tabs the user has visited since the drawer was last opened. We keep
  // visited panels mounted so their drafts survive tab switches, but we
  // only mount a panel (and let it fetch) on first visit. The non-active
  // visited panels are hidden via `hidden` and receive `isActive={false}`
  // so their queries disable while their local draft state is preserved.
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<QuickEditTab>>(
    () => new Set<QuickEditTab>([panel]),
  );

  // Derived-state sync: re-align internal tab state with the requested
  // panel synchronously, before the first render of a (re-)open. Using an
  // effect for this would let the previous tab render and fetch first,
  // which violates the lazy-load contract when the parent reopens the
  // drawer on a different pillar.
  //
  // We also override the values we use in this render, not just for the
  // next render. React keeps the in-render setState calls and re-renders
  // with the updated state, but the discarded first render still runs
  // every child hook — so the stale ExpensesPanel would briefly mount
  // and subscribe its query before being thrown away. Reading the new
  // values locally below prevents that wasted subscription.
  // See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [lastOpen, setLastOpen] = useState(open);
  const [lastPanel, setLastPanel] = useState(panel);

  let effectiveActiveTab = activeTab;
  let effectiveVisitedTabs = visitedTabs;

  if (open !== lastOpen || panel !== lastPanel) {
    setLastOpen(open);
    setLastPanel(panel);
    if (open) {
      const freshVisited = new Set<QuickEditTab>([panel]);
      setActiveTab(panel);
      setVisitedTabs(freshVisited);
      effectiveActiveTab = panel;
      effectiveVisitedTabs = freshVisited;
    }
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      rootRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleTabChange(next: QuickEditTab) {
    if (next === effectiveActiveTab) return;
    setActiveTab(next);
    setVisitedTabs((prev) => {
      if (prev.has(next)) return prev;
      const updated = new Set(prev);
      updated.add(next);
      return updated;
    });
  }

  function renderPanelBody(tab: QuickEditTab) {
    const isActive = tab === effectiveActiveTab;
    const commonProps = {
      open,
      yearMonth,
      periodLabel,
      onClose,
      isActive,
      dashboardTerms,
      currency,
    };
    if (tab === "income") return <IncomePanel {...commonProps} />;
    if (tab === "savings") return <SavingsPanel {...commonProps} />;
    if (tab === "debts") return <DebtsPanel {...commonProps} />;
    return <ExpensesPanel {...commonProps} />;
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      aria-hidden={!open}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      className={cn(
        "fixed inset-0 z-[80] outline-none transition-all duration-300",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label={t("closePeriodEditor")}
        onClick={onClose}
        className={cn(
          "absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex justify-end">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("editPeriodAriaLabel").replace(
            "{periodLabel}",
            periodLabel,
          )}
          className={cn(
            "pointer-events-auto flex h-full w-full flex-col bg-eb-surface shadow-[0_16px_60px_rgba(21,39,81,0.16)] transition-transform duration-300",
            "sm:max-w-[560px]",
            "rounded-none sm:rounded-l-[2rem]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <EditPeriodHeader
            periodLabel={periodLabel}
            periodDateRangeLabel={periodDateRangeLabel}
            titleKey={TITLE_KEY_FOR_TAB[effectiveActiveTab]}
            onClose={onClose}
          />

          <QuickEditTabs
            activeTab={effectiveActiveTab}
            onTabChange={handleTabChange}
          />

          <p
            className="px-4 pt-3 text-xs leading-5 text-eb-text/55 sm:px-6"
            data-testid="quick-edit-active-tab-caption"
          >
            {tTabs("activeTabSaveCaption")}
          </p>

          {QUICK_EDIT_TAB_ORDER.map((tab) => {
            if (!effectiveVisitedTabs.has(tab)) return null;
            const isActive = tab === effectiveActiveTab;
            return (
              <div
                key={tab}
                id={QUICK_EDIT_PANEL_ID[tab]}
                role="tabpanel"
                aria-labelledby={QUICK_EDIT_TAB_ID[tab]}
                hidden={!isActive}
                className={cn(
                  "flex min-h-0 flex-1 flex-col",
                  !isActive && "hidden",
                )}
              >
                {renderPanelBody(tab)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EditPeriodDrawer;
