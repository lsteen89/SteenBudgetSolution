import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";

export type BudgetEditorRowActionItem = {
  key: string;
  label: string;
  tone?: "default" | "danger";
  /**
   * Optional grouping tag. When two adjacent items belong to different
   * groups, a separator is rendered between them. Callers that do not need
   * grouping (Expense, Income, Savings) simply leave this unset — the menu
   * then falls back to the legacy behaviour of separating only the danger
   * tail. Debt PR 3 adds grouping to keep its longer action list scannable
   * (planning / insight / this-month / lifecycle / destructive).
   */
  group?: string;
  onSelect: () => void;
};

type BudgetEditorRowActionsMenuProps = {
  readOnly?: boolean;
  disabledAriaLabel: string;
  openAriaLabel: string;
  items: BudgetEditorRowActionItem[];
};

export default function BudgetEditorRowActionsMenu({
  readOnly = false,
  disabledAriaLabel,
  openAriaLabel,
  items,
}: BudgetEditorRowActionsMenuProps) {
  if (readOnly || items.length === 0) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          disabled
          aria-label={disabledAriaLabel}
          data-testid="budget-editor-row-actions-trigger"
          data-disabled="true"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.65)] text-eb-text/40"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={openAriaLabel}
          data-testid="budget-editor-row-actions-trigger"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl",
            "border border-eb-stroke/30 bg-eb-surface",
            "text-eb-text/80 shadow-[0_4px_12px_rgba(21,39,81,0.08)] transition",
            "hover:bg-[rgb(var(--eb-shell)/0.55)] hover:text-eb-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--eb-accent)/0.20)]",
          )}
        >
          <MoreVertical className="h-4.5 w-4.5" strokeWidth={2.4} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className={cn(
          "z-50 min-w-[190px] rounded-2xl border border-eb-stroke/25 bg-eb-surface p-1.5",
          "shadow-[0_18px_40px_rgba(21,39,81,0.16)]",
        )}
      >
        {items.map((item, index) => {
          // Insert a separator between adjacent items when either:
          //   1. The previous item belongs to a different `group` than the
          //      current item (Debt's grouped kebab uses this), OR
          //   2. The current item is `tone === "danger"` (legacy behaviour
          //      kept so Expense / Income / Savings menus continue to render
          //      the same separator before their delete tail).
          const previous = index > 0 ? items[index - 1] : null;
          const groupChanged =
            previous !== null &&
            previous.group !== undefined &&
            item.group !== undefined &&
            previous.group !== item.group;
          const dangerTail =
            previous !== null &&
            item.tone === "danger" &&
            previous.tone !== "danger";
          const showSeparator = groupChanged || dangerTail;
          return (
            <div key={item.key}>
              {showSeparator ? (
                <DropdownMenuSeparator
                  data-testid={`budget-editor-row-actions-separator-${item.key}`}
                  className="my-1 bg-eb-stroke/20"
                />
              ) : null}
              <DropdownMenuItem
                onClick={item.onSelect}
                data-testid={`budget-editor-row-actions-item-${item.key}`}
                className={cn(
                  "cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none",
                  item.tone === "danger"
                    ? "text-eb-danger focus:bg-[rgb(var(--eb-danger)/0.08)] data-[highlighted]:bg-[rgb(var(--eb-danger)/0.08)]"
                    : "text-eb-text focus:bg-[rgb(var(--eb-shell)/0.30)] data-[highlighted]:bg-[rgb(var(--eb-shell)/0.30)]",
                )}
              >
                {item.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
