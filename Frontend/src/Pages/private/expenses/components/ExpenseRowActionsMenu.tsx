import BudgetEditorRowActionsMenu from "@/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { expenseRowActionsMenuDict } from "@/utils/i18n/pages/private/expenses/ExpenseRowActionsMenu.i18n";
import { tDict } from "@/utils/i18n/translate";

type ExpenseRowActionsMenuProps = {
  readOnly?: boolean;
  isActive: boolean;
  /**
   * Whether the generic pause/resume action is allowed for this row.
   *
   * Pause/resume only flips `isActive` — it does not touch
   * `subscriptionLifecycleStatus`. So for subscriptions whose lifecycle is
   * `paused` or `cancelled`, exposing this action would be misleading:
   * "Resume" would not actually resume the subscription. Hide it in those
   * cases; real lifecycle actions land in PR 4.
   */
  canPauseToggle?: boolean;
  onEdit: () => void;
  onPauseToggle: () => void;
  onDelete: () => void;
};

export default function ExpenseRowActionsMenu({
  readOnly = false,
  isActive,
  canPauseToggle = true,
  onEdit,
  onPauseToggle,
  onDelete,
}: ExpenseRowActionsMenuProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof expenseRowActionsMenuDict.sv>(key: K) =>
    tDict(key, locale, expenseRowActionsMenuDict);

  const items = [
    {
      key: "edit",
      label: t("edit"),
      onSelect: onEdit,
    },
    ...(canPauseToggle
      ? [
          {
            key: "pause",
            label: isActive ? t("pause") : t("resume"),
            onSelect: onPauseToggle,
          },
        ]
      : []),
    {
      key: "delete",
      label: t("delete"),
      tone: "danger" as const,
      onSelect: onDelete,
    },
  ];

  return (
    <BudgetEditorRowActionsMenu
      readOnly={readOnly}
      disabledAriaLabel={t("disabledAriaLabel")}
      openAriaLabel={t("openAriaLabel")}
      items={items}
    />
  );
}
