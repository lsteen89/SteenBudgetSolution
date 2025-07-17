using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using System.Data.Common;


namespace Backend.Infrastructure.Data.Sql.Helpers
{
    public class UnitOfWork : IUnitOfWork
    {
        public DbConnection Connection { get; }
        public DbTransaction Transaction { get; private set; }

        public UnitOfWork(IConnectionFactory connectionFactory)
        {
            Connection = connectionFactory.CreateConnection();
            Connection.Open();
        }

        public void BeginTransaction()
        {
            Transaction = Connection.BeginTransaction();
        }

        public void Commit()
        {
            try
            {
                Transaction?.Commit();
            }
            catch
            {
                Transaction?.Rollback();
                throw;
            }
        }

        public void Rollback()
        {
            Transaction?.Rollback();
        }

        public void Dispose()
        {
            Transaction?.Dispose();
            Connection?.Dispose();
        }
    }
}
