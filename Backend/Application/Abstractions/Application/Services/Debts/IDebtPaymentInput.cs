namespace Backend.Application.Abstractions.Application.Services.Debts;

public interface IDebtPaymentInput
{
    string Type { get; }
    decimal Balance { get; }
    decimal Apr { get; }
    decimal? MinPayment { get; }
    decimal? MonthlyFee { get; }
    int? TermMonths { get; }
}
