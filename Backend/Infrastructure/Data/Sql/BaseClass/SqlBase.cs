using System.Data;
using System.Data.Common;
using Dapper;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;

namespace Backend.Infrastructure.Data
{
    public abstract class SqlBase
    {
        private readonly IConnectionFactory _connectionFactory;
        protected readonly ILogger _logger;

        protected SqlBase(IConnectionFactory connectionFactory, ILogger logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        // Helper to create and open a new connection.
        // You can call this IF you're doing a stand-alone operation
        // that doesn't belong to a larger transaction scope.
        protected async Task<DbConnection> GetOpenConnectionAsync()
        {
            var connection = _connectionFactory.CreateConnection();
            if (connection.State == ConnectionState.Closed)
            {
                await connection.OpenAsync();
            }
            return connection;
        }

        // ----------------------------------
        // ExecuteAsync: Requires the caller to supply DbConnection and DbTransaction
        // ----------------------------------
        public async Task<int> ExecuteAsync(DbConnection conn, string sql, object param, DbTransaction tx = null)
        {
            return await conn.ExecuteAsync(sql, param, tx);
        }

        // ----------------------------------
        // Scalar: (OPTIONAL) If you want to allow a quick one-off scalar query with its own connection
        // you can keep a version that opens a new connection. If you'd rather have the caller handle
        // the connection, remove or rename this method.
        // ----------------------------------
        public async Task<T> ExecuteScalarAsync<T>(DbConnection conn, string sql, object parameters = null, DbTransaction tx = null)
        {
            return await conn.ExecuteScalarAsync<T>(sql, parameters, tx);
        }

        // ----------------------------------
        // Transaction Helpers
        // ----------------------------------
        // Approach A: Pass (conn, tx) to your lambda
        // This method opens a connection and transaction, then passes them to the caller.
        public async Task ExecuteInTransactionAsync(Func<DbConnection, DbTransaction, Task> operation)
        {
            using var conn = await GetOpenConnectionAsync();
            using var tx = await conn.BeginTransactionAsync();
            try
            {
                await operation(conn, tx);
                await tx.CommitAsync();
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        // Overload that returns a value
        public async Task<T> ExecuteInTransactionAsync<T>(Func<DbConnection, DbTransaction, Task<T>> operation)
        {
            using var conn = await GetOpenConnectionAsync();
            using var tx = await conn.BeginTransactionAsync();
            try
            {
                T result = await operation(conn, tx);
                await tx.CommitAsync();
                return result;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }


        // ----------------------------------
        // Query Helpers: also pass in DbConnection (and optional transaction).
        // ----------------------------------
        public async Task<T?> QueryFirstOrDefaultAsync<T>(
            DbConnection conn,
            string sql,
            object? parameters = null,
            DbTransaction? transaction = null
        )
        {
            return await conn.QueryFirstOrDefaultAsync<T>(sql, parameters, transaction);
        }

        public async Task<List<T>> QueryAsync<T>(
            DbConnection conn,
            string sql,
            object? parameters = null,
            DbTransaction? transaction = null
        )
        {
            var result = await conn.QueryAsync<T>(sql, parameters, transaction);
            return result.ToList();
        }
    }
}
