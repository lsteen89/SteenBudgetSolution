using System.Data;
using System.Data.Common;
using Microsoft.Extensions.Logging;
using Dapper;

namespace Backend.Infrastructure.Data
{
    public abstract class SqlBase
    {
        protected readonly DbConnection _connection;
        protected readonly ILogger _logger;

        protected SqlBase(DbConnection connection, ILogger logger)
        {
            _connection = connection;
            _logger = logger;
        }

        protected async Task OpenConnectionAsync()
        {
            if (_connection.State == ConnectionState.Closed)
            {
                await _connection.OpenAsync();
            }
        }

        protected async Task CloseConnectionAsync()
        {
            if (_connection.State == ConnectionState.Open)
            {
                await _connection.CloseAsync();
            }
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

        protected async Task<T> ExecuteScalarAsync<T>(string sql, object? parameters = null)
        {
            try
            {
                return await _connection.ExecuteScalarAsync<T>(sql, parameters);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing scalar SQL: {Sql}", sql);
                throw;
            }
        }

        protected async Task ExecuteInTransactionAsync(Func<DbTransaction, Task> operation)
        {
            await OpenConnectionAsync();
            using var transaction = await _connection.BeginTransactionAsync();
            try
            {
                await operation(transaction);
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Transaction failed and was rolled back.");
                throw;
            }
            finally
            {
                await CloseConnectionAsync();
            }
        }
        public async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? parameters = null, DbTransaction? transaction = null)
        {
            try
            {
                return await _connection.QueryFirstOrDefaultAsync<T>(sql, parameters, transaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing SQL query: {Sql}", sql);
                throw;
            }
        }

    }
}
