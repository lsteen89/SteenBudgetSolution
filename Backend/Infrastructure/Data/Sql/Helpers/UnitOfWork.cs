using System.Data;
using System.Data.Common;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Settings;
using Microsoft.Extensions.Options;
using MySqlConnector;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly ILogger<UnitOfWork> _log;
    private readonly DatabaseSettings _opt;

    private MySqlConnection? _conn;
    private MySqlTransaction? _tx;
    private int _txDepth;
    private bool _disposed;

    public UnitOfWork(IOptions<DatabaseSettings> opt, ILogger<UnitOfWork> log)
    {
        _opt = opt.Value;
        _log = log;
    }

    public DbConnection? Connection => _conn;
    public DbTransaction? Transaction => _tx;
    public bool IsInTransaction => _tx is not null;

    public async Task BeginTransactionAsync(CancellationToken ct)
    {
        ThrowIfDisposed();

        if (_tx is not null)
        {
            _txDepth++;
            _log.LogDebug("UoW: re-entered transaction, depth={Depth}", _txDepth);
            return;
        }

        if (_conn is null)
            _conn = new MySqlConnection(_opt.ConnectionString);

        if (_conn.State != ConnectionState.Open)
            await _conn.OpenAsync(ct).ConfigureAwait(false);

        _tx = await _conn.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct).ConfigureAwait(false);
        _txDepth = 1;
        _log.LogDebug("UoW: BEGIN (depth=1)");
    }

    public async Task CommitAsync(CancellationToken ct)
    {
        ThrowIfDisposed();
        if (_tx is null) return;

        _txDepth--;
        if (_txDepth > 0)
        {
            _log.LogDebug("UoW: commit deferred (depth={Depth})", _txDepth);
            return;
        }

        try
        {
            await _tx.CommitAsync(ct).ConfigureAwait(false);
            _log.LogDebug("UoW: COMMIT");
        }
        catch
        {
            await SafeRollbackAsync().ConfigureAwait(false);
            throw;
        }
        finally
        {
            await DisposeTxAsync().ConfigureAwait(false);
        }
    }

    public async Task RollbackAsync(CancellationToken ct)
    {
        ThrowIfDisposed();
        if (_tx is null) return;

        try
        {
            await _tx.RollbackAsync(ct).ConfigureAwait(false);
            _log.LogWarning("UoW: ROLLBACK");
        }
        finally
        {
            _txDepth = 0;
            await DisposeTxAsync().ConfigureAwait(false);
        }
    }

    private async Task SafeRollbackAsync()
    {
        try { if (_tx is not null) await _tx.RollbackAsync().ConfigureAwait(false); }
        catch (Exception ex) { _log.LogError(ex, "UoW: rollback after commit failure also failed."); }
        finally { _txDepth = 0; await DisposeTxAsync().ConfigureAwait(false); }
    }

    private async Task DisposeTxAsync()
    {
        if (_tx is not null)
        {
            await _tx.DisposeAsync().ConfigureAwait(false);
            _tx = null;
        }
    }

    private void ThrowIfDisposed()
    {
        if (_disposed) throw new ObjectDisposedException(nameof(UnitOfWork));
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        if (_tx is not null)
        {
            try { await _tx.RollbackAsync().ConfigureAwait(false); }
            catch { /* ignore on dispose */ }
            finally { await _tx.DisposeAsync().ConfigureAwait(false); }
        }

        if (_conn is not null)
        {
            await _conn.CloseAsync().ConfigureAwait(false);
            await _conn.DisposeAsync().ConfigureAwait(false);
        }
    }
}
