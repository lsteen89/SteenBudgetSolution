import BudgetEditorWorkspaceBar from "@/components/molecules/forms/budgetEditor/BudgetEditorWorkspaceBar";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { expensesEditorWorkspaceBarDict } from "@/utils/i18n/pages/private/expenses/ExpensesEditorWorkspaceBar.i18n";
import { tDict } from "@/utils/i18n/translate";

type ExpensesEditorWorkspaceBarProps = {
  yearMonthLabel: string;
  incomeTotal: number;
  expenseTotal: number;
  remainingTotal: number;
  onCreate: () => void;
  readOnly: boolean;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
};

export default function ExpensesEditorWorkspaceBar({
  yearMonthLabel,
  incomeTotal,
  expenseTotal,
  remainingTotal,
  onCreate,
  readOnly,
}: ExpensesEditorWorkspaceBarProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof expensesEditorWorkspaceBarDict.sv>(
    key: K,
  ) => tDict(key, locale, expensesEditorWorkspaceBarDict);

  return (
    <BudgetEditorWorkspaceBar
      eyebrow={t("eyebrow")}
      title={interpolate(t("title"), { yearMonthLabel })}
      description={interpolate(t("description"), { yearMonthLabel })}
      readOnlyBadge={t("readOnlyBadge")}
      createLabel={t("create")}
      periodLabel={yearMonthLabel}
      periodCaption={t("period")}
      readOnly={readOnly}
      onCreate={onCreate}
      metrics={[
        {
          label: t("income"),
          amount: incomeTotal,
        },
        {
          prefix: "−",
          label: t("expenses"),
          amount: expenseTotal,
        },
        {
          prefix: "=",
          label: t("remaining"),
          amount: remainingTotal,
          tone: remainingTotal < 0 ? "danger" : "accent",
        },
      ]}
    />
  );
}
