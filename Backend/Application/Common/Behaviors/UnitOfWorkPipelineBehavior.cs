using System.Data.Common;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared; // Result, Error
using MediatR;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace Backend.Application.Common.Behaviors;

/// <summary>
/// UnitOfWork pipeline behavior that provides a single, consistent transaction boundary
/// for commands that opt-in via the marker interface <c>ITransactionalCommand</c>.
/// 
/// What it does:
/// 1) If the request does NOT implement <see cref="ITransactionalCommand"/>, it simply calls the next behavior/handler (no transaction).
/// 2) If it DOES implement the marker, it:
///    - Begins a DB transaction via <see cref="IUnitOfWork"/>.
///    - Executes the request handler.
///    - Commits on success; rolls back on:
///        a) Any thrown exception (DB or otherwise), OR
///        b) A handler returning <c>Result</c>/<c>Result&lt;T&gt;</c> in a Failure state (business failure).
///    - Logs structured context and maps technical DB exceptions to a safe failure when the handler returns <c>Result</c>.
///
/// Design notes:
/// - Repositories should NOT try/catch DB exceptions. Let them bubble here.
/// - Handlers should return <c>Result</c> for business decisions; this behavior will rollback on Failure without requiring exceptions.
/// - This keeps transaction rules and logging in one place (clean architecture & single responsibility).
/// - Register this behavior AFTER validation/auth behaviors so we don't open transactions for requests that will fail early.
/// </summary>
public sealed class UnitOfWorkPipelineBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<UnitOfWorkPipelineBehavior<TRequest, TResponse>> _log;

    public UnitOfWorkPipelineBehavior(
        IUnitOfWork uow,
        ILogger<UnitOfWorkPipelineBehavior<TRequest, TResponse>> log)
    {
        _uow = uow;
        _log = log;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        // No generic constraint on TRequest: avoid CS0246/CS0314.
        // Instead, opt-in at runtime: only transactional for ITransactionalCommand.
        if (request is not ITransactionalCommand)
            return await next();

        using (_log.BeginScope(new Dictionary<string, object?>
        {
            ["Command"] = typeof(TRequest).Name
        }))
        {
            await _uow.BeginTransactionAsync(ct);
            _log.LogInformation("UoW: BEGIN for {Command}", typeof(TRequest).Name);

            try
            {
                var response = await next();

                // Roll back on business failure when returning Result/Result<T>
                if (IsFailureResult(response))
                {
                    await SafeRollbackAsync();
                    _log.LogInformation("UoW: ROLLBACK (business failure) for {Command}", typeof(TRequest).Name);
                    return response; // propagate the failure as-is
                }

                await _uow.CommitAsync(ct);
                _log.LogInformation("UoW: COMMIT for {Command}", typeof(TRequest).Name);
                return response;
            }
            catch (MySqlException ex)
            {
                await SafeRollbackAsync();
                _log.LogError(ex, "DB(MySQL) error in {Command}. Number={Number}", typeof(TRequest).Name, ex.Number);
                return MapFailureIfResult<TResponse>("Database.Error", "Couldn’t save your data right now.", ex);
            }
            catch (DbException ex)
            {
                await SafeRollbackAsync();
                _log.LogError(ex, "DB error in {Command}.", typeof(TRequest).Name);
                return MapFailureIfResult<TResponse>("Database.Error", "Couldn’t save your data right now.", ex);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                await SafeRollbackAsync();
                _log.LogWarning("Operation canceled in {Command}.", typeof(TRequest).Name);
                return MapFailureIfResult<TResponse>("Request.Canceled", "Request was canceled.", null);
            }
            catch (Exception ex)
            {
                await SafeRollbackAsync();
                _log.LogError(ex, "Unhandled error in {Command}.", typeof(TRequest).Name);
                return MapFailureIfResult<TResponse>("Server.Error", "Unexpected error. Please try again.", ex);
            }
        }

        async Task SafeRollbackAsync()
        {
            try { await _uow.RollbackAsync(CancellationToken.None); }
            catch (Exception rbEx)
            {
                _log.LogError(rbEx, "Rollback failed in {Command}.", typeof(TRequest).Name);
            }
        }
    }

    /// <summary>
    /// Detects Failure for <c>Result</c> or <c>Result&lt;T&gt;</c> without knowing T at compile time.
    /// </summary>
    private static bool IsFailureResult(object? response)
    {
        if (response is null) return false;

        if (response is Result r) return r.IsFailure;

        var t = response.GetType();
        if (t.IsGenericType && t.GetGenericTypeDefinition() == typeof(Result<>))
        {
            var prop = t.GetProperty("IsFailure");
            return prop is not null && prop.GetValue(response) is bool b && b;
        }
        return false;
    }

    /// <summary>
    /// If the handler's response type is Result/Result&lt;T&gt;, converts an exception into a user-safe failure.
    /// Otherwise, rethrows to preserve existing behavior (e.g., for query handlers not using Result).
    /// </summary>
    private static T MapFailureIfResult<T>(string code, string message, Exception? ex)
    {
        var err = new Error(code, message);

        if (typeof(T) == typeof(Result))
            return (T)(object)Result.Failure(err);

        if (typeof(T).IsGenericType && typeof(T).GetGenericTypeDefinition() == typeof(Result<>))
        {
            var closed = typeof(Result<>).MakeGenericType(typeof(T).GetGenericArguments());
            var failure = closed.GetMethod("Failure", new[] { typeof(Error) })!;
            return (T)failure.Invoke(null, new object[] { err })!;
        }

        if (ex is not null) throw ex;
        throw new InvalidOperationException($"Cannot map failure to {typeof(T).Name}");
    }
}

/// <summary>
/// Marker interface for commands that require a transaction.
/// Apply this to MediatR command records: <c>public sealed record MyCommand(...) : ICommand&lt;Result&gt;, ITransactionalCommand;</c>
/// </summary>
public interface ITransactionalCommand { }
