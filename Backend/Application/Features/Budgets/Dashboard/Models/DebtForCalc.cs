using Backend.Application.Abstractions.Application.Services.Debts;

namespace Backend.Application.Features.Budgets.Dashboard;

public sealed record DebtForCalc(
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MinPayment,
    decimal? MonthlyFee,
    int? TermMonths
) : IDebtPaymentInput;
