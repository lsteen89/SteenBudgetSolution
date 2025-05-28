using System;
using System.Collections.Generic;
using System.Data.Common;
using MySqlConnector;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Backend.Tests.Helpers
{
    public class TestDatabaseHelper : IDisposable
    {
        private readonly string _connectionString; 

        public TestDatabaseHelper(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<(DbConnection Connection, DbTransaction Transaction)> CreateAndBeginTransactionAsync()
        {
            var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();
            var transaction = connection.BeginTransaction();
            return (connection, transaction);
        }

        public DbConnection CreateConnection() => new MySqlConnection(_connectionString);

        public void Dispose()
        {

        }
    }
}
