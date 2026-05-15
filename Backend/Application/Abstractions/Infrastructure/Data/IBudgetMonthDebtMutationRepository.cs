using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthDebtMutationRepository
{
    Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthDebtEditorRowReadModel>> GetDebtEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct);

    Task<BudgetMonthDebtMutationReadModel?> GetDebtForMutationAsync(
        Guid budgetMonthId,
        Guid monthDebtId,
        CancellationToken ct);

    Task UpdateMonthDebtMonthlyPaymentAsync(
        UpdateBudgetMonthDebtModel model,
        CancellationToken ct);

    Task<bool> BaselineDebtExistsAsync(
        Guid debtId,
        CancellationToken ct);

    /// <summary>
    /// Reads the persisted planned monthly payment from baseline <c>Debt</c>.
    /// Returns <c>null</c> when the baseline row does not exist. Required so
    /// the audit pipeline can record the real before-value when a budget-plan
    /// scope mutation only touches the baseline (e.g. <c>budgetPlanOnly</c>),
    /// where the month-row value would be a lie.
    /// </summary>
    Task<decimal?> GetBaselineDebtMonthlyPaymentAsync(
        Guid debtId,
        CancellationToken ct);

    Task UpdateBaselineDebtMonthlyPaymentAsync(
        UpdateBaselineDebtModel model,
        CancellationToken ct);
}
