using Backend.Application.DTO.Budget.Months.Editor.Expense;
namespace Backend.Application.DTO.Budget.Months.Editor;

public sealed record BudgetMonthEditorDto(
    BudgetMonthEditorMetaDto Month,
    IReadOnlyList<BudgetMonthExpenseItemEditorRowDto> ExpenseItems);