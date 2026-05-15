using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;

internal static class DebtMutationApplier
{
    /// <summary>
    /// Applies a debt-row mutation and writes an audit event only when at
    /// least one persisted value actually changed. The audit payload reflects
    /// the real before/after of each side that changed; the baseline
    /// `Debt.MonthlyPayment` before-value is read from the database, never
    /// inferred from the month row (those two values can diverge).
    /// </summary>
    public static async Task<Result<BudgetMonthDebtEditorRowDto?>> ApplyAsync(
        IBudgetMonthDebtMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        BudgetMonthDebtMutationReadModel existing,
        Guid budgetMonthId,
        Guid actorPersoid,
        DateTime now,
        decimal requestedMonthlyPayment,
        string? requestedScope,
        CancellationToken ct)
    {
        var scope = ResolveScope(requestedScope);
        var scopeWritesCurrentMonth = BudgetMonthDebtEditScopes.WritesCurrentMonth(scope);
        var scopeWritesBudgetPlan = BudgetMonthDebtEditScopes.WritesBudgetPlan(scope);

        decimal? baselinePaymentBefore = null;

        if (scopeWritesBudgetPlan)
        {
            if (existing.SourceDebtId is null)
                return Result<BudgetMonthDebtEditorRowDto?>.Failure(
                    BudgetMonthDebtErrors.CannotUpdatePlanForMonthOnlyRow);

            baselinePaymentBefore = await repo.GetBaselineDebtMonthlyPaymentAsync(
                existing.SourceDebtId.Value,
                ct);

            if (baselinePaymentBefore is null)
                return Result<BudgetMonthDebtEditorRowDto?>.Failure(
                    BudgetMonthDebtErrors.SourcePlanNotFound);
        }

        var monthPaymentChanged = scopeWritesCurrentMonth &&
            existing.MonthlyPayment != requestedMonthlyPayment;

        var planPaymentChanged = scopeWritesBudgetPlan &&
            baselinePaymentBefore!.Value != requestedMonthlyPayment;

        if (monthPaymentChanged)
        {
            await repo.UpdateMonthDebtMonthlyPaymentAsync(
                new UpdateBudgetMonthDebtModel(
                    Id: existing.Id,
                    BudgetMonthId: existing.BudgetMonthId,
                    MonthlyPayment: requestedMonthlyPayment,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        if (planPaymentChanged)
        {
            await repo.UpdateBaselineDebtMonthlyPaymentAsync(
                new UpdateBaselineDebtModel(
                    DebtId: existing.SourceDebtId!.Value,
                    MonthlyPayment: requestedMonthlyPayment,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        if (monthPaymentChanged || planPaymentChanged)
        {
            var before = new Dictionary<string, decimal>();
            var after = new Dictionary<string, decimal>();

            if (monthPaymentChanged)
            {
                before["monthPayment"] = existing.MonthlyPayment;
                after["monthPayment"] = requestedMonthlyPayment;
            }

            if (planPaymentChanged)
            {
                before["planPayment"] = baselinePaymentBefore!.Value;
                after["planPayment"] = requestedMonthlyPayment;
            }

            var changeSetJson = JsonSerializer.Serialize(new
            {
                before,
                after,
                scope,
                currentMonthUpdated = monthPaymentChanged,
                baselineUpdated = planPaymentChanged
            });

            await changeEvents.InsertAsync(
                new BudgetMonthChangeEventWriteModel(
                    Id: Guid.NewGuid(),
                    BudgetMonthId: budgetMonthId,
                    EntityType: BudgetAuditEntityTypes.Debt,
                    EntityId: existing.Id,
                    SourceEntityId: existing.SourceDebtId,
                    ChangeType: BudgetAuditChangeTypes.Updated,
                    ChangeSetJson: changeSetJson,
                    ChangedByUserId: actorPersoid,
                    ChangedAt: now),
                ct);
        }

        return Result<BudgetMonthDebtEditorRowDto?>.Success(
            new BudgetMonthDebtEditorRowDto(
                Id: existing.Id,
                SourceDebtId: existing.SourceDebtId,
                Name: existing.Name ?? "",
                Type: existing.Type,
                Balance: existing.Balance,
                Apr: existing.Apr,
                MonthlyFee: existing.MonthlyFee,
                MinPayment: existing.MinPayment,
                TermMonths: existing.TermMonths,
                MonthlyPayment: monthPaymentChanged
                    ? requestedMonthlyPayment
                    : existing.MonthlyPayment,
                Status: existing.Status,
                IsDeleted: existing.IsDeleted,
                IsMonthOnly: existing.SourceDebtId is null,
                CanUpdateDefault: existing.SourceDebtId is not null));
    }

    private static string ResolveScope(string? requestedScope)
    {
        if (!string.IsNullOrWhiteSpace(requestedScope) &&
            BudgetMonthDebtEditScopes.IsSupported(requestedScope))
        {
            return requestedScope!;
        }

        return BudgetMonthDebtEditScopes.CurrentMonthOnly;
    }
}
