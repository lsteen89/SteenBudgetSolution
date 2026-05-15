namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

public sealed record UpdateBudgetMonthDebtModel(
    Guid Id,
    Guid BudgetMonthId,
    decimal MonthlyPayment,
    Guid ActorPersoid,
    DateTime UtcNow);
