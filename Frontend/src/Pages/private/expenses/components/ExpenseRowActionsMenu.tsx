import BudgetEditorRowActionsMenu, {
  type BudgetEditorRowActionItem,
} from "@/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";
import { expenseRowActionsMenuDict } from "@/utils/i18n/pages/private/expenses/ExpenseRowActionsMenu.i18n";
import { tDict } from "@/utils/i18n/translate";

type ExpenseRowActionsMenuLabels = {
  edit: string;
  delete: string;
  pause: string;
  resume: string;
  subscriptionPause: string;
  subscriptionResume: string;
  subscriptionCancel: string;
  subscriptionReactivate: string;
};

export type ExpenseRowActionsMenuAction =
  | "edit"
  | "delete"
  | "pause"
  | "resume"
  | "subscriptionPause"
  | "subscriptionResume"
  | "subscriptionCancel"
  | "subscriptionReactivate";

type BuildArgs = {
  labels: ExpenseRowActionsMenuLabels;
  isActive: boolean;
  isSubscription: boolean;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
  onEdit: () => void;
  onDelete: () => void;
  /** Generic active/inactive toggle. Used for non-subscription rows. */
  onPauseToggle: () => void;
  /** Lifecycle change. Used only for subscription rows. */
  onLifecycleChange: (next: SubscriptionLifecycleStatus) => void;
};

/**
 * Build the action menu items for an expense row.
 *
 * Subscription rows get real lifecycle actions (pause / resume / cancel /
 * reactivate) instead of the generic active toggle. Non-subscription rows keep
 * the generic pause/resume, which flips `isActive` on the month row.
 *
 * Exported for unit testing — the actual menu component just renders these.
 */
export function buildExpenseRowActions({
  labels,
  isActive,
  isSubscription,
  subscriptionLifecycleStatus,
  onEdit,
  onDelete,
  onPauseToggle,
  onLifecycleChange,
}: BuildArgs): Array<BudgetEditorRowActionItem & { key: ExpenseRowActionsMenuAction }> {
  const items: Array<
    BudgetEditorRowActionItem & { key: ExpenseRowActionsMenuAction }
  > = [
    { key: "edit", label: labels.edit, onSelect: onEdit },
  ];

  if (isSubscription) {
    // Treat null lifecycle as `active` for action mapping. The backend
    // defaults to `active` for subscription rows, so a missing value means
    // "currently active" rather than "indeterminate".
    const effectiveLifecycle: SubscriptionLifecycleStatus =
      subscriptionLifecycleStatus ?? "active";

    if (effectiveLifecycle === "active") {
      items.push({
        key: "subscriptionPause",
        label: labels.subscriptionPause,
        onSelect: () => onLifecycleChange("paused"),
      });
      items.push({
        key: "subscriptionCancel",
        label: labels.subscriptionCancel,
        onSelect: () => onLifecycleChange("cancelled"),
      });
    } else if (effectiveLifecycle === "paused") {
      items.push({
        key: "subscriptionResume",
        label: labels.subscriptionResume,
        onSelect: () => onLifecycleChange("active"),
      });
      items.push({
        key: "subscriptionCancel",
        label: labels.subscriptionCancel,
        onSelect: () => onLifecycleChange("cancelled"),
      });
    } else {
      // cancelled — no point offering pause; only reactivate.
      items.push({
        key: "subscriptionReactivate",
        label: labels.subscriptionReactivate,
        onSelect: () => onLifecycleChange("active"),
      });
    }
  } else {
    // Non-subscription rows keep the simple isActive toggle.
    items.push({
      key: isActive ? "pause" : "resume",
      label: isActive ? labels.pause : labels.resume,
      onSelect: onPauseToggle,
    });
  }

  items.push({
    key: "delete",
    label: labels.delete,
    tone: "danger" as const,
    onSelect: onDelete,
  });

  return items;
}

type ExpenseRowActionsMenuProps = {
  readOnly?: boolean;
  isActive: boolean;
  isSubscription: boolean;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
  onEdit: () => void;
  onPauseToggle: () => void;
  onLifecycleChange: (next: SubscriptionLifecycleStatus) => void;
  onDelete: () => void;
};

export default function ExpenseRowActionsMenu({
  readOnly = false,
  isActive,
  isSubscription,
  subscriptionLifecycleStatus,
  onEdit,
  onPauseToggle,
  onLifecycleChange,
  onDelete,
}: ExpenseRowActionsMenuProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof expenseRowActionsMenuDict.sv>(key: K) =>
    tDict(key, locale, expenseRowActionsMenuDict);

  const items = buildExpenseRowActions({
    labels: {
      edit: t("edit"),
      delete: t("delete"),
      pause: t("pause"),
      resume: t("resume"),
      subscriptionPause: t("subscriptionPause"),
      subscriptionResume: t("subscriptionResume"),
      subscriptionCancel: t("subscriptionCancel"),
      subscriptionReactivate: t("subscriptionReactivate"),
    },
    isActive,
    isSubscription,
    subscriptionLifecycleStatus,
    onEdit,
    onDelete,
    onPauseToggle,
    onLifecycleChange,
  });

  return (
    <BudgetEditorRowActionsMenu
      readOnly={readOnly}
      disabledAriaLabel={t("disabledAriaLabel")}
      openAriaLabel={t("openAriaLabel")}
      items={items}
    />
  );
}
