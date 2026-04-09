namespace Backend.Application.DTO.Budget.Months.Editor.Expense;

public sealed record BudgetMonthExpenseItemEditorRowDto(
    Guid Id,
    Guid? SourceExpenseItemId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    bool IsDeleted,
    bool IsMonthOnly,
    bool CanUpdateDefault);