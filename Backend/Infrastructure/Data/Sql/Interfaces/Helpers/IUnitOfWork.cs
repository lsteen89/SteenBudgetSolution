using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Helpers
{
    public interface IUnitOfWork : IDisposable
    {
        DbConnection Connection { get; }
        DbTransaction Transaction { get; }
        void BeginTransaction();
        void Commit();
        void Rollback();
    }
}
