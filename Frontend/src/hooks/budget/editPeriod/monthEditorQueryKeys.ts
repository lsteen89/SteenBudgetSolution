/**
 * Centralized query keys for the month editor slice.
 * Shared so the invalidation helper and the `useBudgetMonthEditor` hook
 * cannot drift out of sync.
 */
export const monthEditorQueryKeys = {
  editor: (yearMonth: string) =>
    ["budget", "month-editor", yearMonth] as const,
};
