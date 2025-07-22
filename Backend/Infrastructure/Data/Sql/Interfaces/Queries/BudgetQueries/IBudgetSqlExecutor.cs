using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget_Queries
{
    public interface IBudgetSqlExecutor
    {
        Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId); // Adding a repayment strategy to the main budget table
    }
}
