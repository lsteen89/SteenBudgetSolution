using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Helpers
{
    public interface ITransactionRunner
    {
        Task ExecuteAsync(Func<DbConnection, DbTransaction, Task> work);
        Task<T> ExecuteAsync<T>(Func<DbConnection, DbTransaction, Task<T>> work);
    }
}
