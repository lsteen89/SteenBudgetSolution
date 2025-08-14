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

        private DbConnection Connection => _uow.Connection!;
        private DbTransaction? Transaction => _uow.Transaction;

        protected Task<int> ExecuteAsync(string sql, object? param = null, CancellationToken ct = default)
            => Connection.ExecuteAsync(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));

        protected Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null, CancellationToken ct = default)
            => Connection.ExecuteScalarAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));

        protected Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? param = null, CancellationToken ct = default)
            => Connection.QueryFirstOrDefaultAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));

        protected Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null, CancellationToken ct = default)
            => Connection.QuerySingleOrDefaultAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));

        protected async Task<List<T>> QueryAsync<T>(string sql, object? param = null, CancellationToken ct = default)
        {
            var rows = await Connection.QueryAsync<T>(new CommandDefinition(sql, param, Transaction, _cmdTimeout, cancellationToken: ct));
            return rows.AsList();
        }
    }
}