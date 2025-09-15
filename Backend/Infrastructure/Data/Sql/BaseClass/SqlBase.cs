using Backend.Application.Abstractions.Infrastructure.Data;
using Dapper;
using System.Data.Common;

namespace Backend.Infrastructure.Data.BaseClass
{
    public abstract class SqlBase
    {
        private readonly IUnitOfWork _uow;
        protected readonly ILogger _logger;
        private readonly int _cmdTimeout;

        protected SqlBase(IUnitOfWork unitOfWork, ILogger logger, int commandTimeoutSeconds = 30)
        {
            _uow = unitOfWork;
            _logger = logger;
            _cmdTimeout = commandTimeoutSeconds;
        }

        private DbTransaction? Transaction => _uow.Transaction;

        protected async Task<int> ExecuteAsync(string sql, object? param = null, CancellationToken ct = default)
        {
            var conn = await _uow.GetOpenConnectionAsync(ct);
            return await conn.ExecuteAsync(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));
        }

        protected async Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null, CancellationToken ct = default)
        {
            var conn = await _uow.GetOpenConnectionAsync(ct);
            return await conn.ExecuteScalarAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));
        }

        protected async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? param = null, CancellationToken ct = default)
        {
            var conn = await _uow.GetOpenConnectionAsync(ct);
            return await conn.QueryFirstOrDefaultAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));
        }

        protected async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null, CancellationToken ct = default)
        {
            var conn = await _uow.GetOpenConnectionAsync(ct);
            return await conn.QuerySingleOrDefaultAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));
        }

        protected async Task<List<T>> QueryAsync<T>(string sql, object? param = null, CancellationToken ct = default)
        {
            var conn = await _uow.GetOpenConnectionAsync(ct);
            var rows = await conn.QueryAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));
            return rows.AsList();
        }

        protected void EnsureTransaction()
        {
            if (_uow.Transaction is null)
                throw new InvalidOperationException("No active DB transaction. Ensure requests go through UnitOfWorkPipelineBehavior.");
        }
    }
}