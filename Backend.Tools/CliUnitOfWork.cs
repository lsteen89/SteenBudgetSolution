using System.Data;
using System.Data.Common; // Use this namespace for DbConnection/DbTransaction
using Backend.Application.Abstractions.Infrastructure.Data;

public sealed class CliUnitOfWork : IUnitOfWork
{
    private readonly DbConnection _connection;
    private DbTransaction? _transaction;
    private bool _disposed;

    public CliUnitOfWork(DbConnection connection) => _connection = connection;

    public DbConnection? Connection => _connection;
    public DbTransaction? Transaction => _transaction;
    public bool IsInTransaction => _transaction is not null;

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        if (IsInTransaction)
        {
            // Already in a transaction, do nothing.
            return;
        }

        if (_connection.State == ConnectionState.Closed)
        {
            await _connection.OpenAsync(ct);
        }

        _transaction = await _connection.BeginTransactionAsync(ct);
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_transaction is null)
        {
            // No transaction to commit.
            return;
        }

        await _transaction.CommitAsync(ct);
        await DisposeTransactionAsync();
    }

    public async Task RollbackAsync(CancellationToken ct = default)
    {
        if (_transaction is null)
        {
            // No transaction to roll back.
            return;
        }

        await _transaction.RollbackAsync(ct);
        await DisposeTransactionAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        // If the UoW is disposed with an active transaction, it must be rolled back.
        if (_transaction is not null)
        {
            await _transaction.RollbackAsync();
            await DisposeTransactionAsync();
        }

        await _connection.DisposeAsync();
    }

    private async Task DisposeTransactionAsync()
    {
        if (_transaction is not null)
        {
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }
}