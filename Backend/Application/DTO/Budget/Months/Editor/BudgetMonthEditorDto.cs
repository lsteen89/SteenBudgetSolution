namespace Backend.Application.DTO.Budget.Months.Editor.Expense;

public sealed record BudgetMonthEditorDto(
    BudgetMonthEditorMetaDto Month,
    IReadOnlyList<BudgetMonthExpenseItemEditorRowDto> ExpenseItems);