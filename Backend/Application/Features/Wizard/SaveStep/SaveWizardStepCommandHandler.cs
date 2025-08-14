using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;

namespace Backend.Application.Features.Wizard.SaveStep;

public sealed class SaveWizardStepCommandHandler : ICommandHandler<SaveWizardStepCommand, Result>
{
    private readonly IWizardRepository _wizardRepository;
    private readonly IEnumerable<IWizardStepValidator> _validators;

    public SaveWizardStepCommandHandler(IWizardRepository wizardRepository, IEnumerable<IWizardStepValidator> validators)
    {
        _wizardRepository = wizardRepository;
        _validators = validators;
    }

    public async Task<Result> Handle(SaveWizardStepCommand request, CancellationToken ct)
    {
        // 1. Find the correct validator strategy for this step
        var validator = _validators.FirstOrDefault(v => v.StepNumber == request.StepNumber);
        if (validator is null)
        {
            return Result.Failure(new Error("Wizard.ValidatorNotFound", $"No validator found for step {request.StepNumber}."));
        }

        // 2. Execute the validation and serialization strategy
        var validationResult = validator.ValidateAndSerialize(request.StepData);
        if (validationResult.IsFailure)
        {
            return Result.Failure(validationResult.Error);
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