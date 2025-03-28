using MySqlConnector;
using System.Data.Common;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;

namespace Backend.Infrastructure.Data.Sql.Factories
{
    public class MySqlConnectionFactory : IConnectionFactory
    {
        private readonly string _connectionString;

        public MySqlConnectionFactory(string connectionString)
        {
            _connectionString = connectionString;
        }

        public DbConnection CreateConnection()
        {
            return new MySqlConnection(_connectionString);
        }
    }
}