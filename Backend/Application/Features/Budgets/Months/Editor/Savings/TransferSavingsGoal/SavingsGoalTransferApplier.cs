using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.TransferSavingsGoal;

/// <summary>
/// Applies a V2 one-time transfer (deposit / withdraw) to a savings goal's
/// running balance. Unlike the rename / target-amount appliers, this is
/// the *only* applier that mutates <c>AmountSaved</c> from a request — the
/// existing flow advances <c>AmountSaved</c> via close-month accumulation
/// (BudgetMonthSavingsGoalMutationRepository.Sql.cs:237–290) and goal
/// creation, never from the editor.
///
/// Write strategy (from PR-V2-OVERVIEW.md §3):
/// <list type="bullet">
///   <item>Current-month snapshot — always updated so the UI reflects the
///         deposit immediately.</item>
///   <item>Plan baseline — updated whenever the snapshot links to one so
///         future month materialisations see the deposit and close-month
///         math stays consistent.</item>
///   <item>Other already-materialised open months — <b>not</b> cascaded.
///         A mid-month transfer applies only to the month the user is
///         editing; other open months keep their own snapshot balance
///         until they are next touched.</item>
/// </list>
///
/// Below-zero withdraws are rejected with
/// <see cref="BudgetMonthSavingsGoalErrors.WithdrawalBelowZero"/>. Above-
/// target deposits are intentionally allowed — over-saving is a normal
/// user choice and the UI shows a soft warning, not a hard block.
/// </summary>
internal static class SavingsGoalTransferApplier
{
    public static async Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> ApplyAsync(
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        BudgetMonthSavingsGoalMutationReadModel existing,
        Guid budgetMonthId,
        Guid actorPersoid,
        DateTime now,
        decimal amount,
        string direction,
        string? note,
        CancellationToken ct)
    {
        if (!SavingsGoalTransferDirections.IsSupported(direction))
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                BudgetMonthSavingsGoalErrors.UnknownTransferDirection);

        var normalizedDirection = SavingsGoalTransferDirections.Normalize(direction);

        // AmountSaved is nullable in the read model — treat null as zero
        // so a freshly created plan-linked goal can still accept a
        // deposit on day one without seeding logic upstream.
        var before = existing.AmountSaved ?? 0m;
        var signedDelta = normalizedDirection == SavingsGoalTransferDirections.Deposit
            ? amount
            : -amount;
        var after = before + signedDelta;

        if (after < 0m)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                BudgetMonthSavingsGoalErrors.WithdrawalBelowZero);

        // Source-plan presence is required for any plan-level write —
        // mirrors `SavingsGoalRenameApplier.cs:47–53` and
        // `SavingsGoalTargetAmountApplier.cs:56–62`. For a detached
        // (month-only) row we never look at the baseline.
        if (existing.SourceSavingsGoalId is Guid baselineSourceId)
        {
            var baselineExists = await repo.BaselineSavingsGoalExistsAsync(baselineSourceId, ct);
            if (!baselineExists)
                return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                    BudgetMonthSavingsGoalErrors.SourcePlanNotFound);
        }

        // 1. Current-month snapshot — always writes (the row is loaded above).
        await repo.UpdateMonthSavingsGoalAmountSavedAsync(
            new UpdateBudgetMonthSavingsGoalAmountSavedModel(
                Id: existing.Id,
                BudgetMonthSavingsId: existing.BudgetMonthSavingsId,
                AmountSaved: after,
                ActorPersoid: actorPersoid,
                UtcNow: now),
            ct);

        var baselineUpdated = false;

        if (existing.SourceSavingsGoalId is Guid sourceId)
        {
            // 2. Source plan row — keeps future-month materialisations and
            //    close-month math aligned with what the user just did.
            await repo.UpdateBaselineSavingsGoalAmountSavedAsync(
                new UpdateBaselineSavingsGoalAmountSavedModel(
                    SavingsGoalId: sourceId,
                    AmountSaved: after,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
            baselineUpdated = true;
        }

        // Build the audit payload. The note + direction + amount give the
        // change event enough context to reconstruct the user intent
        // without joining back to another table.
        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = new { AmountSaved = (decimal?)before },
            after = new { AmountSaved = (decimal?)after },
            direction = normalizedDirection,
            amount,
            note,
            baselineUpdated,
        });

        await changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EntityType: BudgetAuditEntityTypes.SavingsGoal,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceSavingsGoalId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: actorPersoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(BuildRowDto(existing, after));
    }

    private static BudgetMonthSavingsGoalEditorRowDto BuildRowDto(
        BudgetMonthSavingsGoalMutationReadModel existing,
        decimal newAmountSaved)
        => new(
            Id: existing.Id,
            SourceSavingsGoalId: existing.SourceSavingsGoalId,
            Name: existing.Name ?? string.Empty,
            TargetAmount: existing.TargetAmount,
            TargetDate: existing.TargetDate,
            AmountSaved: newAmountSaved,
            MonthlyContribution: existing.MonthlyContribution,
            Status: existing.Status,
            ClosedReason: existing.ClosedReason,
            ClosedAt: existing.ClosedAt,
            IsDeleted: existing.IsDeleted,
            IsMonthOnly: existing.SourceSavingsGoalId is null,
            CanUpdateDefault: existing.SourceSavingsGoalId is not null);
}
