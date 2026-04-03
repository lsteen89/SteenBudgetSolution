using Backend.Application.Features.Budgets.Months.Models.Insert;

namespace Backend.Application.Abstractions.Infrastructure.Data;

using Backend.Application.Features.Budgets.Months.Models.Insert;

public interface IBudgetMonthMaterializationRepository
{
    Task<bool> HasMaterializedIncomeAsync(Guid budgetMonthId, CancellationToken ct);
    Task<Guid?> GetBudgetMonthIncomeIdAsync(Guid budgetMonthId, CancellationToken ct);

    Task InsertBudgetMonthIncomeIdempotentAsync(
        Guid id,
        Guid budgetMonthId,
        Guid? sourceIncomeId,
        decimal netSalaryMonthly,
        int salaryFrequency,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);

    Task<int> InsertBudgetMonthIncomeSideHustlesIdempotentAsync(
        Guid budgetMonthIncomeId,
        IReadOnlyList<BudgetMonthIncomeSideHustleSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);

    Task<int> InsertBudgetMonthIncomeHouseholdMembersIdempotentAsync(
        Guid budgetMonthIncomeId,
        IReadOnlyList<BudgetMonthIncomeHouseholdMemberSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);

    Task<int> InsertBudgetMonthExpenseItemsIdempotentAsync(
        Guid budgetMonthId,
        IReadOnlyList<BudgetMonthExpenseItemSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);

    Task<bool> HasMaterializedSavingsAsync(Guid budgetMonthId, CancellationToken ct);
    Task<Guid?> GetBudgetMonthSavingsIdAsync(Guid budgetMonthId, CancellationToken ct);

    Task InsertBudgetMonthSavingsIdempotentAsync(
        Guid id,
        Guid budgetMonthId,
        Guid? sourceSavingsId,
        decimal monthlySavings,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);

    Task<int> InsertBudgetMonthSavingsGoalsIdempotentAsync(
        Guid budgetMonthSavingsId,
        IReadOnlyList<BudgetMonthSavingsGoalSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);

    Task<int> InsertBudgetMonthDebtsIdempotentAsync(
        Guid budgetMonthId,
        IReadOnlyList<BudgetMonthDebtSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);
}