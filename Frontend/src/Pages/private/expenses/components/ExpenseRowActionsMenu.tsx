import BudgetEditorRowActionsMenu from "@/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { expenseRowActionsMenuDict } from "@/utils/i18n/pages/private/expenses/ExpenseRowActionsMenu.i18n";
import { tDict } from "@/utils/i18n/translate";

type ExpenseRowActionsMenuProps = {
  readOnly?: boolean;
  isActive: boolean;
  onEdit: () => void;
  onPauseToggle: () => void;
  onDelete: () => void;
};

export default function ExpenseRowActionsMenu({
  readOnly = false,
  isActive,
  onEdit,
  onPauseToggle,
  onDelete,
}: ExpenseRowActionsMenuProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof expenseRowActionsMenuDict.sv>(key: K) =>
    tDict(key, locale, expenseRowActionsMenuDict);

  return (
    <BudgetEditorRowActionsMenu
      readOnly={readOnly}
      disabledAriaLabel={t("disabledAriaLabel")}
      openAriaLabel={t("openAriaLabel")}
      items={[
        {
          key: "edit",
          label: t("edit"),
          onSelect: onEdit,
        },
        {
          key: "pause",
          label: isActive ? t("pause") : t("resume"),
          onSelect: onPauseToggle,
        },
        {
          key: "delete",
          label: t("delete"),
          tone: "danger",
          onSelect: onDelete,
        },
      ]}
    />
  );
}
