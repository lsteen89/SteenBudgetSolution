namespace Backend.Application.Features.Budgets.Months.Models.Baseline;

public sealed record BaselineIncomeSeedRm(
    Guid Id,
    decimal NetSalaryMonthly,
    int SalaryFrequency);
