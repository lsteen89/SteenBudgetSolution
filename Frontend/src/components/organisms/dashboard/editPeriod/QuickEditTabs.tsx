import { Coins, CreditCard, PiggyBank, ShoppingCart } from "lucide-react";
import React, { useRef } from "react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { quickEditTabsDict } from "@/utils/i18n/pages/private/dashboard/cards/period/quickEditTabs.i18n";
import { tDict } from "@/utils/i18n/translate";

export type QuickEditTab = "income" | "expenses" | "savings" | "debts";

export const QUICK_EDIT_TAB_ORDER: ReadonlyArray<QuickEditTab> = [
  "income",
  "expenses",
  "savings",
  "debts",
];

export const QUICK_EDIT_TAB_ID: Record<QuickEditTab, string> = {
  income: "quick-edit-tab-income",
  expenses: "quick-edit-tab-expenses",
  savings: "quick-edit-tab-savings",
  debts: "quick-edit-tab-debts",
};

export const QUICK_EDIT_PANEL_ID: Record<QuickEditTab, string> = {
  income: "quick-edit-panel-income",
  expenses: "quick-edit-panel-expenses",
  savings: "quick-edit-panel-savings",
  debts: "quick-edit-panel-debts",
};

type QuickEditTabsProps = {
  activeTab: QuickEditTab;
  onTabChange: (tab: QuickEditTab) => void;
};

const TAB_ICON: Record<
  QuickEditTab,
  React.ComponentType<{ className?: string }>
> = {
  income: Coins,
  expenses: ShoppingCart,
  savings: PiggyBank,
  debts: CreditCard,
};

/**
 * Tab strip for the Quick Edit drawer. Each tab maps to one domain panel
 * (income / expenses / savings / debts) hosted in the drawer shell.
 *
 * Selection follows the WAI-ARIA tabs pattern: only the active tab is in the
 * focus order, arrow keys move focus between tabs, and Home/End jump to the
 * ends. Activation is automatic — moving focus selects the tab.
 */
const QuickEditTabs: React.FC<QuickEditTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof quickEditTabsDict.sv>(key: K) =>
    tDict(key, locale, quickEditTabsDict);

  const buttonRefs = useRef<Record<QuickEditTab, HTMLButtonElement | null>>({
    income: null,
    expenses: null,
    savings: null,
    debts: null,
  });

  const labels: Record<QuickEditTab, string> = {
    income: t("incomeTab"),
    expenses: t("expensesTab"),
    savings: t("savingsTab"),
    debts: t("debtsTab"),
  };

  function focusAndActivate(next: QuickEditTab) {
    onTabChange(next);
    // Defer focus so the tab is selected before focus moves. Without the
    // defer, screen readers can announce focus before the selection change.
    requestAnimationFrame(() => {
      buttonRefs.current[next]?.focus();
    });
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: QuickEditTab,
  ) {
    const index = QUICK_EDIT_TAB_ORDER.indexOf(current);
    let next: QuickEditTab | null = null;

    if (event.key === "ArrowRight") {
      next =
        QUICK_EDIT_TAB_ORDER[(index + 1) % QUICK_EDIT_TAB_ORDER.length];
    } else if (event.key === "ArrowLeft") {
      next =
        QUICK_EDIT_TAB_ORDER[
          (index - 1 + QUICK_EDIT_TAB_ORDER.length) %
            QUICK_EDIT_TAB_ORDER.length
        ];
    } else if (event.key === "Home") {
      next = QUICK_EDIT_TAB_ORDER[0];
    } else if (event.key === "End") {
      next = QUICK_EDIT_TAB_ORDER[QUICK_EDIT_TAB_ORDER.length - 1];
    }

    if (!next || next === current) return;

    event.preventDefault();
    focusAndActivate(next);
  }

  return (
    <div
      role="tablist"
      aria-label={t("tablistAriaLabel")}
      className="flex gap-1 overflow-x-auto border-b border-eb-stroke/25 px-3 py-2 sm:px-5"
    >
      {QUICK_EDIT_TAB_ORDER.map((tab) => {
        const Icon = TAB_ICON[tab];
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            ref={(el) => {
              buttonRefs.current[tab] = el;
            }}
            id={QUICK_EDIT_TAB_ID[tab]}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={QUICK_EDIT_PANEL_ID[tab]}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              if (isActive) return;
              onTabChange(tab);
            }}
            onKeyDown={(event) => handleKeyDown(event, tab)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25",
              isActive
                ? "bg-eb-accent/10 text-eb-text shadow-eb"
                : "text-eb-text/60 hover:bg-[rgb(var(--eb-shell)/0.35)] hover:text-eb-text",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isActive ? "text-eb-accent" : "text-eb-text/55",
              )}
            />
            <span>{labels[tab]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickEditTabs;
