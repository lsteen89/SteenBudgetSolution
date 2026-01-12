export type BudgetMonthStatus = "open" | "closed" | "skipped";
export type CarryOverMode = "none" | "full" | "custom";

export interface BudgetMonthListItemDto {
    yearMonth: string; // "YYYY-MM"
    status: BudgetMonthStatus;
    openedAt: string | null;
    closedAt: string | null;
}

export interface BudgetMonthsStatusDto {
    openMonthYearMonth: string | null;
    currentYearMonth: string; // "YYYY-MM"
    gapMonthsCount: number;
    months: BudgetMonthListItemDto[]; // desc
    suggestedAction: string;
}
