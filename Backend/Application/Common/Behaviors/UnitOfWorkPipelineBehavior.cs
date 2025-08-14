using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;
using MediatR;

public interface ITransactionalCommand { }

public class UnitOfWorkPipelineBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ITransactionalCommand
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UnitOfWorkPipelineBehavior<TRequest, TResponse>> _logger;

    public UnitOfWorkPipelineBehavior(IUnitOfWork unitOfWork, ILogger<UnitOfWorkPipelineBehavior<TRequest, TResponse>> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (_unitOfWork.IsInTransaction)
        {
            return await next(); // Already in a transaction, let it flow
        }

        await _unitOfWork.BeginTransactionAsync(ct);
        _logger.LogInformation("Beginning transaction for {RequestName}", typeof(TRequest).Name);

        try
        {
            var response = await next();
            await _unitOfWork.CommitAsync(ct);
            _logger.LogInformation("Committed transaction for {RequestName}", typeof(TRequest).Name);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Rolling back transaction for {RequestName}", typeof(TRequest).Name);
            await _unitOfWork.RollbackAsync(CancellationToken.None); // Don't cancel a rollback
            throw;
        }
    }
}