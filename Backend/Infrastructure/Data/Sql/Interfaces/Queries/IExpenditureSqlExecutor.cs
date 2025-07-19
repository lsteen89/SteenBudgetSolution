using Backend.Domain.Entities.Budget.Expenses;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries
{
    public interface IExpenditureSqlExecutor
    {
        Task InsertExpenseItemsAsync(Expense aggrigate);
    }
}
