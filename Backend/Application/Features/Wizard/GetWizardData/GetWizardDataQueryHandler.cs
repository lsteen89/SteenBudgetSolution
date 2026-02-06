using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Wizard;
using Backend.Domain.Shared;
using Backend.Domain.Errors.Wizard;
using Backend.Application.Models.Wizard;
using Backend.Application.Features.Wizard.GetWizardData.Abstractions;

namespace Backend.Application.Features.Wizard.GetWizardData;

public sealed class GetWizardDataQueryHandler
    : IQueryHandler<GetWizardDataQuery, Result<WizardSavedDataDto?>>
{
    private readonly IWizardRepository _repo;
    private readonly IWizardStepRowReducer _stepReducer;
    private readonly IWizardStepDataAssembler _assembler;

    public GetWizardDataQueryHandler(
        IWizardRepository repo,
        IWizardStepRowReducer stepReducer,
        IWizardStepDataAssembler assembler)
    {
        _repo = repo;
        _stepReducer = stepReducer;
        _assembler = assembler;
    }

    public async Task<Result<WizardSavedDataDto?>> Handle(GetWizardDataQuery request, CancellationToken ct)
    {
        var raw = (await _repo.GetRawWizardStepDataAsync(request.SessionId, ct)).ToList();

        if (raw.Count == 0)
            return Result<WizardSavedDataDto?>.Success(null);

        var maxSubStepByMajor = raw
            .GroupBy(r => r.StepNumber)
            .ToDictionary(g => g.Key, g => g.Max(x => x.SubStep));

        var latestRows = _stepReducer.Reduce(raw); // ILookup<int, WizardStepRowEntity>

        // ✅ Flatten groups before Max
        var highestVersion = latestRows
            .SelectMany(g => g)
            .Max(r => r.DataVersion);

        var data = new WizardData();

        if (latestRows.Contains(1))
            data.Income = _assembler.AssembleSingle<IncomeFormValues>(latestRows[1]);

        if (latestRows.Contains(2))
            data.Expenditure = _assembler.AssembleMulti<ExpenditureFormValues>(latestRows[2]);

        if (latestRows.Contains(3))
            data.Savings = _assembler.AssembleMulti<SavingsFormValues>(latestRows[3]);

        if (latestRows.Contains(4))
            data.Debts = _assembler.AssembleMulti<DebtsFormValues>(latestRows[4]);

        var (majorStep, subStep) = await _repo.GetCurrentStepAsync(request.SessionId, ct);

        var dto = new WizardSavedDataDto(
            WizardData: data,
            Progress: new WizardProgressDto(
                MajorStep: majorStep,
                SubStep: subStep,
                MaxSubStepByMajor: maxSubStepByMajor
            ),
            DataVersion: highestVersion
        );

        return Result<WizardSavedDataDto?>.Success(dto);
    }
}