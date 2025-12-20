using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.Abstractions.Application.Services.Debts;

public interface IDebtPaymentCalculator
{
    decimal CalculateMonthlyPayment(Debt d);
}
