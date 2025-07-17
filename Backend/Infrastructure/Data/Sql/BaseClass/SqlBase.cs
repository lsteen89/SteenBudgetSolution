using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Dapper;
using System.Data;
using System.Data.Common;

namespace Backend.Infrastructure.Data
{
    public abstract class SqlBase
    {
        // These fields will be nullable to support both constructors
        private readonly IUnitOfWork? _unitOfWork;
        private readonly IConnectionFactory? _connectionFactory;
        protected readonly ILogger _logger;

        // NEW constructor for modern, UoW-based classes
        protected SqlBase(IUnitOfWork unitOfWork, ILogger logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        // OLD constructor for legacy classes. Marked as Obsolete.
        [Obsolete("This constructor is deprecated. Refactor to inject IUnitOfWork instead.")]
        protected SqlBase(IConnectionFactory connectionFactory, ILogger logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }
        #region new
        // =================================================================
        // NEW, UoW-based Data Access Methods
        // These are the methods we will use in all refactored classes.
        // Plan is to remove the old methods after all classes are updated.
        // Step by step, we will refactor each class to use these methods.
        // =================================================================

        protected Task<int> ExecuteAsync(string sql, object? param = null)
        {
            if (_unitOfWork is null) throw new InvalidOperationException("Cannot use this method without a Unit of Work. Please refactor to inject IUnitOfWork.");
            return _unitOfWork.Connection.ExecuteAsync(sql, param, _unitOfWork.Transaction);
        }

        protected Task<T> ExecuteScalarAsync<T>(string sql, object? parameters = null)
        {
            if (_unitOfWork is null) throw new InvalidOperationException("Cannot use this method without a Unit of Work. Please refactor to inject IUnitOfWork.");
            return _unitOfWork.Connection.ExecuteScalarAsync<T>(sql, parameters, _unitOfWork.Transaction);
        }

        protected Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? parameters = null)
        {
            if (_unitOfWork is null) throw new InvalidOperationException("Cannot use this method without a Unit of Work. Please refactor to inject IUnitOfWork.");
            return _unitOfWork.Connection.QueryFirstOrDefaultAsync<T>(sql, parameters, _unitOfWork.Transaction);
        }

        protected async Task<List<T>> QueryAsync<T>(string sql, object? parameters = null)
        {
            if (_unitOfWork is null) throw new InvalidOperationException("Cannot use this method without a Unit of Work. Please refactor to inject IUnitOfWork.");
            var result = await _unitOfWork.Connection.QueryAsync<T>(sql, parameters, _unitOfWork.Transaction);
            return result.ToList();
        }
        #endregion

        #region old
        // =================================================================
        // OLD, DEPRECATED Data Access Methods
        // These methods are kept for backward compatibility during the transition.
        // They will be deleted after the refactor is complete.
        // =================================================================
        [Obsolete("This method is deprecated. Refactor to use the new Unit of Work pattern.")]
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
        [Obsolete("This method is deprecated. Refactor to use the new Unit of Work pattern.")]
        public async Task<int> ExecuteAsync(DbConnection conn, string sql, object param, DbTransaction tx = null)
        {
            return await conn.ExecuteAsync(sql, param, tx);
        }

        // ----------------------------------
        // Scalar: (OPTIONAL) If you want to allow a quick one-off scalar query with its own connection
        // you can keep a version that opens a new connection. If you'd rather have the caller handle
        // the connection, remove or rename this method.
        // ----------------------------------
        [Obsolete("This method is deprecated. Refactor to use the new Unit of Work pattern.")]
        public async Task<T> ExecuteScalarAsync<T>(DbConnection conn, string sql, object parameters = null, DbTransaction tx = null)
        {
            return await conn.ExecuteScalarAsync<T>(sql, parameters, tx);
        }

        // ----------------------------------
        // Transaction Helpers
        // ----------------------------------
        // Approach A: Pass (conn, tx) to your lambda
        // This method opens a connection and transaction, then passes them to the caller.
        [Obsolete("This method is deprecated. Refactor to use the new Unit of Work pattern.")]
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
        [Obsolete("This method is deprecated. Refactor to use the new Unit of Work pattern.")]
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
        [Obsolete("This method is deprecated. Refactor to use the new Unit of Work pattern.")]
        public async Task<T?> QueryFirstOrDefaultAsync<T>(
            DbConnection conn,
            string sql,
            object? parameters = null,
            DbTransaction? transaction = null
        )
        {
            return await conn.QueryFirstOrDefaultAsync<T>(sql, parameters, transaction);
        }
        [Obsolete("This method is deprecated. Refactor to use the new Unit of Work pattern.")]
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
        #endregion
    }
}
