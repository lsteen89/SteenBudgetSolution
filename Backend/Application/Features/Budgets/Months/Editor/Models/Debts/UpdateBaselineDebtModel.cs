namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

public sealed record UpdateBaselineDebtModel(
    Guid DebtId,
    decimal MonthlyPayment,
    Guid ActorPersoid,
    DateTime UtcNow);
