namespace Backend.Application.Features.Budgets.Income.Models;

public sealed record IncomePaymentTimingReadModel(
    Guid Id,
    string IncomePaymentDayType,
    int? IncomePaymentDay);
