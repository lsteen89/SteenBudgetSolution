// Infrastructure/Data/BaseClass/SqlBase.cs
using Backend.Application.Abstractions.Infrastructure.Data;
using Dapper;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Data;
using System.Data.Common;
using Backend.Settings;

namespace Backend.Infrastructure.Data.BaseClass;

public abstract class SqlBase
{
    private readonly IUnitOfWork _uow;
    protected readonly ILogger _logger;
    private readonly int _cmdTimeout;

    // Read timeout from DI'ed settings instead of a magic number
    protected SqlBase(IUnitOfWork unitOfWork, ILogger logger, IOptions<DatabaseSettings> db)
    {
        _uow = unitOfWork;
        _logger = logger;
        _cmdTimeout = db.Value.DefaultCommandTimeoutSeconds;
    }

    private DbTransaction? Transaction => _uow.Transaction;

    // ---- WRITE HELPERS (enforce ambient tx) ----
    protected async Task<int> ExecuteAsync(string sql, object? param = null, CancellationToken ct = default)
    {
        EnsureActiveTransaction();
        var conn = await _uow.GetOpenConnectionAsync(ct);
        var cmd = new CommandDefinition(
            sql,
            parameters: param,
            transaction: Transaction,
            commandTimeout: _cmdTimeout,
            commandType: CommandType.Text,
            flags: CommandFlags.Buffered,
            cancellationToken: ct);
        return await conn.ExecuteAsync(cmd);
    }

    protected async Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null, CancellationToken ct = default)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);
        var cmd = new CommandDefinition(
            sql, param, Transaction, _cmdTimeout, CommandType.Text,
            flags: CommandFlags.Buffered, cancellationToken: ct);
        return await conn.ExecuteScalarAsync<T>(cmd);
    }

    protected async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? param = null, CancellationToken ct = default)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);
        var cmd = new CommandDefinition(
            sql, param, Transaction, _cmdTimeout, CommandType.Text,
            flags: CommandFlags.Buffered, cancellationToken: ct);
        return await conn.QueryFirstOrDefaultAsync<T>(cmd);
    }

    protected async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null, CancellationToken ct = default)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);
        var cmd = new CommandDefinition(
            sql, param, Transaction, _cmdTimeout, CommandType.Text,
            flags: CommandFlags.Buffered, cancellationToken: ct);
        return await conn.QuerySingleOrDefaultAsync<T>(cmd);
    }

    protected async Task<List<T>> QueryAsync<T>(string sql, object? param = null, CancellationToken ct = default)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);
        var cmd = new CommandDefinition(
            sql, param, Transaction, _cmdTimeout, CommandType.Text,
            flags: CommandFlags.Buffered, cancellationToken: ct);
        var rows = await conn.QueryAsync<T>(cmd);
        return rows.AsList();
    }

    // Writes should never run outside the UoW pipeline
    protected void EnsureActiveTransaction()
    {
        if (Transaction is null)
            throw new InvalidOperationException("No active DB transaction. Ensure requests go through UnitOfWorkPipelineBehavior.");
    }
}
