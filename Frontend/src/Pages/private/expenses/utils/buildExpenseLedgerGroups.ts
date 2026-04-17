import type { BudgetMonthEditorDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import type {
  ExpenseLedgerGroupKey,
  ExpenseLedgerGroupVm,
  ExpenseLedgerRowVm,
} from "../types/expenseEditor.types";

function mapExpenseCategoryToGroup(categoryKey: string): ExpenseLedgerGroupKey {
  switch (categoryKey) {
    case "housing":
    case "fixed":
      return "fixed";

    case "subscription":
      return "subscription";

    default:
      return "variable";
  }
}

type BuildExpenseLedgerGroupsArgs = {
  editor: BudgetMonthEditorDto;
  categories: ExpenseCategoryDto[];
  locale: AppLocale;
};

export function buildExpenseLedgerGroups({
  editor,
  categories,
  locale,
}: BuildExpenseLedgerGroupsArgs): ExpenseLedgerGroupVm[] {
  const categoriesById = new Map(categories.map((x) => [x.id, x]));

  const rows: ExpenseLedgerRowVm[] = (editor.expenseItems ?? [])
    .filter((x) => !x.isDeleted)
    .map((x) => {
      const category = categoriesById.get(x.categoryId);
      const categoryKey = category ? asCategoryKey(category.code) : "other";

      return {
        id: x.id,
        name: x.name,
        categoryId: x.categoryId,
        categoryLabel: labelCategory(categoryKey, locale),
        categoryKey,
        amountMonthly: x.amountMonthly,
        isActive: x.isActive,
        isDeleted: x.isDeleted,
        group: mapExpenseCategoryToGroup(categoryKey),
      };
    });

  const groupDefs: Array<{ key: ExpenseLedgerGroupKey; title: string }> = [
    { key: "fixed", title: "Fasta kostnader" },
    { key: "variable", title: "Rörliga kostnader" },
    { key: "subscription", title: "Abonnemang" },
  ];

  return groupDefs.map((groupDef) => {
    const groupRows = rows.filter((row) => row.group === groupDef.key);

    return {
      key: groupDef.key,
      title: groupDef.title,
      rows: groupRows,
      total: groupRows.reduce((sum, row) => {
        return sum + (row.isActive ? row.amountMonthly : 0);
      }, 0),
    };
  });
}
