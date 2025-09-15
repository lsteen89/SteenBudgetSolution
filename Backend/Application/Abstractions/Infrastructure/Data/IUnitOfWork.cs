using System.Data.Common;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IUnitOfWork : IAsyncDisposable
{
    DbConnection? Connection { get; }
    DbTransaction? Transaction { get; }
    bool IsInTransaction { get; }
    Task BeginTransactionAsync(CancellationToken ct);
    Task CommitAsync(CancellationToken ct);
    Task RollbackAsync(CancellationToken ct);
    Task<DbConnection> GetOpenConnectionAsync(CancellationToken ct = default);
}

