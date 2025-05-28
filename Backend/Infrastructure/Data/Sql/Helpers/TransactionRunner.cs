using System.Data.Common;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Microsoft.Extensions.Logging;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;

namespace Backend.Infrastructure.Data.Sql.Helpers
{
    public sealed class TransactionRunner : SqlBase, ITransactionRunner
    {
        public TransactionRunner(IConnectionFactory cf, ILogger<TransactionRunner> log)
            : base(cf, log) { }

        public Task ExecuteAsync(
            Func<DbConnection, DbTransaction, Task> work) =>
            ExecuteInTransactionAsync(work);

        public Task<T> ExecuteAsync<T>(
            Func<DbConnection, DbTransaction, Task<T>> work) =>
            ExecuteInTransactionAsync(work);
    }
}
