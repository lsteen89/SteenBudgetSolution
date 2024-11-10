using System.Data.Common;
using Dapper;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Backend.Test.UserTests.BaseClass
{
    public abstract class TestDatabaseHelper
    {
        protected readonly DbConnection _connection;
        protected readonly ILogger _logger;

        protected TestDatabaseHelper(DbConnection connection, ILogger logger)
        {
            _connection = connection;
            _logger = logger;
        }

        protected async Task<int> ExecuteAsync(string sql, object? parameters = null, DbTransaction? transaction = null)
        {
            try
            {
                return await _connection.ExecuteAsync(sql, parameters, transaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing SQL: {Sql}", sql);
                throw;
            }
        }
    }
}
