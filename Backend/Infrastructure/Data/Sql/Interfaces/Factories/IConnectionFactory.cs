using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Factories
{
    public interface IConnectionFactory
    {
        DbConnection CreateConnection();
    }
}
