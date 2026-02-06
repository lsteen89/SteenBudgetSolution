using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Shared;
using Backend.Application.Features.Wizard.Finalization.Abstractions;

namespace Backend.Application.Features.Wizard.Finalization;

public sealed class FinalizeWizardCommandHandler
    : ICommandHandler<FinalizeWizardCommand, Result<Guid>>
{
    private readonly IWizardRepository _wizardRepository;
    private readonly IBudgetRepository _budgetRepository;
    private readonly IUserRepository _userRepository;
    private readonly IWizardStepOrchestrator _orchestrator;
    private readonly IFinalizeBudgetTargetFactory _targetFactory;
    private readonly ILogger<FinalizeWizardCommandHandler> _logger;

    public FinalizeWizardCommandHandler(
        IWizardRepository wizardRepository,
        IBudgetRepository budgetRepository,
        IUserRepository userRepository,
        IWizardStepOrchestrator orchestrator,
        IFinalizeBudgetTargetFactory targetFactory,
        ILogger<FinalizeWizardCommandHandler> logger)
    {
        _wizardRepository = wizardRepository;
        _budgetRepository = budgetRepository;
        _userRepository = userRepository;
        _orchestrator = orchestrator;
        _targetFactory = targetFactory;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(FinalizeWizardCommand request, CancellationToken ct)
    {
        // Guard: wizard has data (or let orchestrator return Wizard.NoData)
        var wizardDataExists = await _wizardRepository.HasAnyStepDataAsync(request.SessionId, ct);
        if (!wizardDataExists)
            return Result<Guid>.Failure(new Error("Wizard.NoData", "No wizard data found to finalize."));

        var budgetId = Guid.NewGuid();
        _logger.LogInformation("Beginning budget finalization for Persoid {Persoid}. BudgetId {BudgetId}",
            request.Persoid, budgetId);

        // Create main budget row first (as today)
        await _budgetRepository.CreateBudgetAsync(budgetId, request.Persoid, ct);

        // Run steps (this is the “meat”, but it lives elsewhere)
        var target = _targetFactory.Create(budgetId);
        var run = await _orchestrator.RunAsync(request.SessionId, target, ct);
        if (run.IsFailure)
            return Result<Guid>.Failure(run.Error);

        // Non-critical post steps
        _ = await _userRepository.SetFirstTimeLoginAsync(request.Persoid, ct);
        _ = await _wizardRepository.DeleteSessionAsync(request.SessionId, ct);

        _logger.LogInformation("Budget finalization successful for BudgetId {BudgetId}", budgetId);
        return Result<Guid>.Success(budgetId);
    }
}
