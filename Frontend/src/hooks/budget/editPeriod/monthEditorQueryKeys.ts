/**
 * Centralized query keys for the month editor slice.
 * Shared so the invalidation helper and the `useBudgetMonthEditor` hook
 * cannot drift out of sync.
 */
export const monthEditorQueryKeys = {
  editor: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth] as const,
  incomeItems: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth, "income-items"] as const,
  savingsGoals: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth, "savings-goals"] as const,
  savingsOldGoals: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth, "savings-goals", "old"] as const,
  savingsMethods: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth, "savings-methods"] as const,
  debtItems: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth, "debt-items"] as const,
  debtEditor: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth, "debt-editor"] as const,
};
