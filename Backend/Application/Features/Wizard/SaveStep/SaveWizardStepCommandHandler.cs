using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;

namespace Backend.Application.Features.Wizard.SaveStep;

public sealed class SaveWizardStepCommandHandler : ICommandHandler<SaveWizardStepCommand, Result>
{
    private readonly IWizardRepository _wizardRepository;
    private readonly IEnumerable<IWizardStepValidator> _validators;
    private readonly ILogger<SaveWizardStepCommandHandler> _logger;

    public SaveWizardStepCommandHandler(IWizardRepository wizardRepository, IEnumerable<IWizardStepValidator> validators, ILogger<SaveWizardStepCommandHandler> logger)
    {
        _wizardRepository = wizardRepository;
        _validators = validators;
        _logger = logger;
    }

    public async Task<Result> Handle(SaveWizardStepCommand request, CancellationToken ct)
    {
        _logger.LogInformation("Saving wizard step {StepNumber}.{SubStepNumber} for session {SessionId}",
            request.StepNumber, request.SubStepNumber, request.SessionId);
        // 1. Find the correct validator strategy for this step
        var validator = _validators.FirstOrDefault(v => v.StepNumber == request.StepNumber);
        if (validator is null)
        {
            _logger.LogError("No validator found for step {StepNumber}", request.StepNumber);
            return Result.Failure(new Error("Wizard.ValidatorNotFound", $"No validator found for step {request.StepNumber}."));
        }

        // 2. Execute the validation and serialization strategy
        var validationResult = validator.ValidateAndSerialize(request.StepData);
        if (validationResult.IsFailure)
        {
            return Result.Failure(validationResult.Error);
        }
        if (validationResult.Value is null)
        {
            // This is an unexpected state: validation succeeded but produced no data to save.
            return Result.Failure(new Error("Wizard.NullData", "Validated step data cannot be null."));
        }

        string jsonData = validationResult.Value;

        // 3. Persist the data using the repository
        var success = await _wizardRepository.UpsertStepDataAsync(
            request.SessionId,
            request.StepNumber,
            request.SubStepNumber,
            jsonData,
            request.DataVersion,
            ct);

        return success ? Result.Success() : Result.Failure(new Error("Database.SaveFailed", "Failed to save wizard step."));
    }
}