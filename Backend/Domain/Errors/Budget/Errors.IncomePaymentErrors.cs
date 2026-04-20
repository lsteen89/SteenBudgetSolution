using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

public static class IncomePaymentErrors
{
    public static readonly Error InvalidType =
        new("IncomePayment.InvalidType", "IncomePaymentDayType must be dayOfMonth or lastDayOfMonth.");

    public static readonly Error InvalidDay =
        new("IncomePayment.InvalidDay", "IncomePaymentDay must match the selected payment timing.");

    public static readonly Error BudgetMonthIncomeNotFound =
        new("BudgetMonthIncome.NotFound", "Budget month income was not found for the current month.");

    public static readonly Error BaselineIncomeNotFound =
        new("Income.NotFound", "Baseline income was not found for the current budget.");
}
