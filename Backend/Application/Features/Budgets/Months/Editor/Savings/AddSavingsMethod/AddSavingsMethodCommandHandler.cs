using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.AddSavingsMethod;

// Inserts a plan-level savings method row for the user's budget. The handler
// is idempotent on the user-visible identity (system code OR case-insensitive
// custom label): if a matching row already exists, the existing row is
// returned unchanged. This mirrors how the editor UI behaves — clicking the
// same chip twice should never produce a duplicate or surface an error — and
// keeps the popover honest under network retries.
//
// The DB CHECK / UNIQUE constraints are the last line of defense; we do not
// rely on them for happy-path behavior because both the system-code unique
// index and the custom-label unique index use generated columns that the
// handler can already pre-check from `GetSavingsMethodsAsync`.
public sealed class AddSavingsMethodCommandHandler
    : IRequestHandler<AddSavingsMethodCommand, Result<SavingsMethodDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly TimeProvider _timeProvider;

    public AddSavingsMethodCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _timeProvider = timeProvider;
    }

    public async Task<Result<SavingsMethodDto?>> Handle(
        AddSavingsMethodCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<SavingsMethodDto?>.Failure(ensured.Error!);

        // Validator already enforces this, but re-checking here keeps the
        // handler honest for any future caller that bypasses validation.
        if (!SavingsMethodCodes.IsKnown(cmd.Code))
            return Result<SavingsMethodDto?>.Failure(SavingsMethodErrors.UnknownCode);

        var savingsId = await _repo.GetSavingsIdForBudgetAsync(ensured.Value.BudgetId, ct);
        if (savingsId is null)
            return Result<SavingsMethodDto?>.Failure(SavingsMethodErrors.SavingsPlanMissing);

        string? normalizedLabel = null;
        if (SavingsMethodCodes.IsCustom(cmd.Code))
        {
            normalizedLabel = cmd.CustomLabel?.Trim();
            if (string.IsNullOrEmpty(normalizedLabel))
                return Result<SavingsMethodDto?>.Failure(SavingsMethodErrors.CustomLabelRequired);
        }

        var existing = await _repo.GetSavingsMethodsAsync(ensured.Value.BudgetId, ct);
        var duplicate = FindDuplicate(existing, cmd.Code, normalizedLabel);
        if (duplicate is not null)
        {
            return Result<SavingsMethodDto?>.Success(
                ToDto(duplicate));
        }

        var newId = Guid.NewGuid();
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        await _repo.InsertSavingsMethodAsync(
            new InsertSavingsMethodModel(
                Id: newId,
                SavingsId: savingsId.Value,
                MethodCode: cmd.Code,
                CustomLabel: normalizedLabel,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        return Result<SavingsMethodDto?>.Success(
            new SavingsMethodDto(
                Id: newId,
                Code: cmd.Code,
                CustomLabel: normalizedLabel));
    }

    private static SavingsMethodReadModel? FindDuplicate(
        IReadOnlyList<SavingsMethodReadModel> existing,
        string code,
        string? normalizedLabel)
    {
        if (SavingsMethodCodes.IsCustom(code))
        {
            if (normalizedLabel is null) return null;
            foreach (var row in existing)
            {
                if (!SavingsMethodCodes.IsCustom(row.MethodCode)) continue;
                if (string.Equals(
                        row.CustomLabel?.Trim(),
                        normalizedLabel,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return row;
                }
            }
            return null;
        }

        foreach (var row in existing)
        {
            if (string.Equals(row.MethodCode, code, StringComparison.Ordinal))
                return row;
        }
        return null;
    }

    private static SavingsMethodDto ToDto(SavingsMethodReadModel row)
        => new(
            Id: row.Id,
            Code: row.MethodCode,
            CustomLabel: SavingsMethodCodes.IsCustom(row.MethodCode) ? row.CustomLabel : null);
}
