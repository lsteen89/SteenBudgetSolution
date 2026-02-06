using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;

namespace Backend.IntegrationTests.Shared;

internal static class UowTx
{
    public static async Task<T> InTx<T>(this UnitOfWork uow, CancellationToken ct, Func<Task<T>> action)
    {
        await uow.BeginTransactionAsync(ct);
        try
        {
            var res = await action();
            await uow.CommitAsync(ct);
            return res;
        }
        catch
        {
            // If you have RollbackAsync, call it here. If not, letting the tx dispose is still better than committing.
            throw;
        }
    }

    public static Task InTx(this UnitOfWork uow, CancellationToken ct, Func<Task> action)
        => uow.InTx(ct, async () => { await action(); return true; });
}
