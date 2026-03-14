import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { WizardExpenseConfirmPreview } from "@/types/Wizard/Step2_Expenditure/WizardExpenseConfirmPreview";
import { mapPreviewIncome } from "@/utils/wizardPreview/mapPreviewIncome";

import type { AppLocale } from "@/types/i18n/appLocale";
import {
  asCategoryKey,
  labelCategory,
  type CategoryKey,
} from "@/utils/i18n/budget/categories";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";

type ItemVm = { title: string; amount: number };

function sum(items: Array<{ amount: number }>) {
  return items.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
}

export function mapFinalizationPreviewToExpenseConfirm(
  preview: BudgetDashboardDto,
  locale: AppLocale,
): WizardExpenseConfirmPreview {
  const { incomeTotal } = mapPreviewIncome(preview);
  const grandTotal = preview.expenditure?.totalExpensesMonthly ?? 0;
  const remaining = incomeTotal - grandTotal;

  // 1) Build breakdown items from recurringExpenses
  const itemsByCategory = new Map<CategoryKey, ItemVm[]>();

  for (const r of preview.recurringExpenses ?? []) {
    const key = asCategoryKey(r.categoryKey ?? r.categoryName);
    const list = itemsByCategory.get(key) ?? [];

    list.push({
      title: labelLedgerItem(r.name ?? "Unknown", locale),
      amount: r.amountMonthly ?? 0,
    });

    itemsByCategory.set(key, list);
  }

  // 2) Inject subscriptions under "subscription"
  const subs = preview.subscriptions?.items ?? [];
  if (subs.length > 0) {
    const list = itemsByCategory.get("subscription") ?? [];
    for (const s of subs) {
      list.push({
        title: s.name ?? "Subscription",
        amount: s.amountMonthly ?? 0,
      });
    }
    itemsByCategory.set("subscription", list);
  }

  // 3) Category order: follow BE byCategory order
  const byCategory = preview.expenditure?.byCategory ?? [];
  const orderedKeys = byCategory.map((c) =>
    asCategoryKey(c.categoryKey ?? c.categoryName),
  );

  if (
    (itemsByCategory.get("subscription")?.length ?? 0) > 0 &&
    !orderedKeys.includes("subscription")
  ) {
    orderedKeys.push("subscription");
  }

  // 4) Build VM categories
  const categories = orderedKeys
    .map((key) => {
      const beCat = byCategory.find(
        (c) => asCategoryKey(c.categoryKey ?? c.categoryName) === key,
      );

      const items = (itemsByCategory.get(key) ?? [])
        .filter((x) => (x.amount ?? 0) !== 0)
        .sort((a, b) => b.amount - a.amount);

      const total =
        beCat?.totalMonthlyAmount ??
        (key === "subscription"
          ? preview.subscriptions?.totalMonthlyAmount
          : undefined) ??
        sum(items);

      return {
        key,
        title: labelCategory(key, locale),
        total,
        items,
      };
    })
    .filter((c) => c.total !== 0 || c.items.length > 0)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  return { incomeTotal, grandTotal, remaining, categories };
}
