using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Helpers
{
    public interface ITransactionRunner
    {
        /// <summary>
        /// These methods are as of now obsolete.
        /// Refactor to use the UoW-based methods instead.
        /// We will gradually remove these after all classes are updated.
        /// 
        [Obsolete("Use UnitOfWork methods instead.")]
        Task ExecuteAsync(Func<DbConnection, DbTransaction, Task> work);
        [Obsolete("Use UnitOfWork methods instead.")]
        Task<T> ExecuteAsync<T>(Func<DbConnection, DbTransaction, Task<T>> work);
    }
}
