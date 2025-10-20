using Backend.Domain.Shared;
using System.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors;

namespace Backend.Application.Features.Wizard.FinalizeWizard;

public sealed class FinalizeWizardCommandHandler
    : ICommandHandler<FinalizeWizardCommand, Result>
{
    private readonly IWizardRepository _wizardRepository;
    private readonly IEnumerable<IWizardStepProcessor> _stepProcessors;
    private readonly ILogger<FinalizeWizardCommandHandler> _logger;

    public FinalizeWizardCommandHandler(
        IWizardRepository wizardRepository,
        IEnumerable<IWizardStepProcessor> stepProcessors,
        ILogger<FinalizeWizardCommandHandler> logger)
    {
        _wizardRepository = wizardRepository;
        _stepProcessors = stepProcessors;
        _logger = logger;
    }
    public async Task<Result> Handle(FinalizeWizardCommand request, CancellationToken ct)
    {
        var wizardData = await _wizardRepository.GetRawStepDataForFinalizationAsync(request.SessionId, ct);
        if (!wizardData.Any())
        {
            return Result.Failure(new Error("Wizard.NoData", "No wizard data found to finalize."));
        }

        var budgetId = Guid.NewGuid();
        _logger.LogInformation("Beginning budget finalization for user: {request.Persoid} BudgetId {BudgetId}", request.Persoid, budgetId);


        // Step 1: Create the main budget record
        //var createBudgetResult = await _wizardRepository.CreateBudgetAsync(budgetId, request.Persoid, ct);
        // The transaction is handled automatically by the UnitOfWorkPipelineBehavior!

        var groupedData = wizardData.GroupBy(d => d.StepNumber);

        foreach (var group in groupedData)
        {
            var processor = _stepProcessors.FirstOrDefault(p => p.StepNumber == group.Key);
            if (processor is null)
            {
                var error = new Error("Wizard.ProcessorNotFound", $"No processor for step {group.Key}.");
                _logger.LogWarning(error.Description);
                return Result.Failure(error); // This will trigger a rollback
            }

            // Get the most recently updated data for this step number
            var latestStepData = group.OrderByDescending(s => s.UpdatedAt).First().StepData;

            // Process the step
            var result = await processor.ProcessAsync(latestStepData, budgetId, ct);
            if (result.IsFailure)
            {
                _logger.LogWarning("Step processor {StepNumber} failed: {Error}", group.Key, result.Error);
                return Result.Failure(result.Error); // This will also trigger a rollback
            }
        }

        // If we get here, all processors succeeded. The pipeline will commit the transaction.
        _logger.LogInformation("Budget finalization successful for BudgetId {BudgetId}", budgetId);
        return Result.Success();
    }
}