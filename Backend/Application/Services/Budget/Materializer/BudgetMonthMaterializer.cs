using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Months.Models.Insert;

namespace Backend.Application.Services.Budget.Materializer;

public sealed class BudgetMonthMaterializer : IBudgetMonthMaterializer
{
    private const string DayOfMonth = "dayOfMonth";
    private const string LastDayOfMonth = "lastDayOfMonth";

    private readonly IBudgetMonthSeedSourceRepository _seedSource;
    private readonly IBudgetMonthMaterializationRepository _materializationRepo;
    private readonly ITimeProvider _clock;

    public BudgetMonthMaterializer(
        IBudgetMonthSeedSourceRepository seedSource,
        IBudgetMonthMaterializationRepository materializationRepo,
        ITimeProvider clock)
    {
        _seedSource = seedSource;
        _materializationRepo = materializationRepo;
        _clock = clock;
    }

    public async Task<Result<bool>> MaterializeIfMissingAsync(
        Guid budgetId,
        Guid budgetMonthId,
        Guid actorPersoid,
        CancellationToken ct)
    {
        var now = _clock.UtcNow;
        var didMaterializeAnything = false;

        var baselineIncome = await _seedSource.GetIncomeAsync(budgetId, ct);
        var sideHustles = await _seedSource.GetActiveSideHustlesAsync(budgetId, ct);
        var householdMembers = await _seedSource.GetActiveHouseholdMembersAsync(budgetId, ct);
        var expenseItems = await _seedSource.GetActiveExpenseItemsAsync(budgetId, ct);

        var baselineSavings = await _seedSource.GetSavingsAsync(budgetId, ct);
        var savingsGoals = await _seedSource.GetActiveSavingsGoalsAsync(budgetId, ct);
        var debts = await _seedSource.GetActiveDebtsAsync(budgetId, ct);

        var hasIncome = await _materializationRepo.HasMaterializedIncomeAsync(budgetMonthId, ct);

        if (!hasIncome)
        {
            var incomePaymentDayType = NormalizeIncomePaymentDayType(
                baselineIncome?.IncomePaymentDayType);
            var incomePaymentDay = NormalizeIncomePaymentDay(
                incomePaymentDayType,
                baselineIncome?.IncomePaymentDay);

            await _materializationRepo.InsertBudgetMonthIncomeIdempotentAsync(
                id: Guid.NewGuid(),
                budgetMonthId: budgetMonthId,
                sourceIncomeId: baselineIncome?.Id,
                netSalaryMonthly: baselineIncome?.NetSalaryMonthly ?? 0m,
                salaryFrequency: baselineIncome?.SalaryFrequency ?? 1,
                incomePaymentDayType: incomePaymentDayType,
                incomePaymentDay: incomePaymentDay,
                actorPersoid: actorPersoid,
                nowUtc: now,
                ct: ct);

            didMaterializeAnything = true;
        }

        var budgetMonthIncomeId = await _materializationRepo.GetBudgetMonthIncomeIdAsync(budgetMonthId, ct);
        if (budgetMonthIncomeId is null)
        {
            return Result<bool>.Failure(
                new Error("BudgetMonth.MaterializationFailed", "Could not load BudgetMonthIncome for materialization."));
        }

        if (sideHustles.Count > 0)
        {
            var sideHustleInserts = sideHustles
                .Select(x => new BudgetMonthIncomeSideHustleSeedInsertModel(
                    Id: Guid.NewGuid(),
                    SourceSideHustleId: x.Id,
                    Name: x.Name,
                    IncomeMonthly: x.IncomeMonthly,
                    Frequency: x.Frequency,
                    SortOrder: x.SortOrder))
                .ToList();

            var inserted = await _materializationRepo.InsertBudgetMonthIncomeSideHustlesIdempotentAsync(
                budgetMonthIncomeId.Value,
                sideHustleInserts,
                actorPersoid,
                now,
                ct);

            didMaterializeAnything = didMaterializeAnything || inserted > 0;
        }

        if (householdMembers.Count > 0)
        {
            var householdInserts = householdMembers
                .Select(x => new BudgetMonthIncomeHouseholdMemberSeedInsertModel(
                    Id: Guid.NewGuid(),
                    SourceHouseholdMemberId: x.Id,
                    Name: x.Name,
                    IncomeMonthly: x.IncomeMonthly,
                    Frequency: x.Frequency,
                    SortOrder: x.SortOrder))
                .ToList();

            var inserted = await _materializationRepo.InsertBudgetMonthIncomeHouseholdMembersIdempotentAsync(
                budgetMonthIncomeId.Value,
                householdInserts,
                actorPersoid,
                now,
                ct);

            didMaterializeAnything = didMaterializeAnything || inserted > 0;
        }

        if (expenseItems.Count > 0)
        {
            var expenseInserts = expenseItems
                .Select(x => new BudgetMonthExpenseItemSeedInsertModel(
                    Id: Guid.NewGuid(),
                    SourceExpenseItemId: x.Id,
                    CategoryId: x.CategoryId,
                    Name: x.Name,
                    AmountMonthly: x.AmountMonthly,
                    SortOrder: x.SortOrder))
                .ToList();

            var inserted = await _materializationRepo.InsertBudgetMonthExpenseItemsIdempotentAsync(
                budgetMonthId,
                expenseInserts,
                actorPersoid,
                now,
                ct);

            didMaterializeAnything = didMaterializeAnything || inserted > 0;
        }

        var hasSavings = await _materializationRepo.HasMaterializedSavingsAsync(budgetMonthId, ct);

        if (!hasSavings)
        {
            await _materializationRepo.InsertBudgetMonthSavingsIdempotentAsync(
                id: Guid.NewGuid(),
                budgetMonthId: budgetMonthId,
                sourceSavingsId: baselineSavings?.Id,
                monthlySavings: baselineSavings?.MonthlySavings ?? 0m,
                actorPersoid: actorPersoid,
                nowUtc: now,
                ct: ct);

            didMaterializeAnything = true;
        }

        var budgetMonthSavingsId = await _materializationRepo.GetBudgetMonthSavingsIdAsync(budgetMonthId, ct);
        if (budgetMonthSavingsId is null)
        {
            return Result<bool>.Failure(
                new Error("BudgetMonth.MaterializationFailed", "Could not load BudgetMonthSavings for materialization."));
        }

        if (savingsGoals.Count > 0)
        {
            var goalInserts = savingsGoals
                .Select((x, index) => new BudgetMonthSavingsGoalSeedInsertModel(
                    Id: Guid.NewGuid(),
                    SourceSavingsGoalId: x.Id,
                    Name: x.Name,
                    TargetAmount: x.TargetAmount,
                    TargetDate: x.TargetDate,
                    AmountSaved: x.AmountSaved,
                    MonthlyContribution: x.MonthlyContribution,
                    OpenedAt: x.OpenedAt,
                    Status: x.Status,
                    ClosedAt: x.ClosedAt,
                    ClosedReason: x.ClosedReason,
                    SortOrder: index))
                .ToList();

            var inserted = await _materializationRepo.InsertBudgetMonthSavingsGoalsIdempotentAsync(
                budgetMonthSavingsId.Value,
                goalInserts,
                actorPersoid,
                now,
                ct);

            didMaterializeAnything = didMaterializeAnything || inserted > 0;
        }

        if (debts.Count > 0)
        {
            var debtInserts = debts
                .Select((x, index) => new BudgetMonthDebtSeedInsertModel(
                    Id: Guid.NewGuid(),
                    SourceDebtId: x.Id,
                    Name: x.Name,
                    Type: x.Type,
                    Balance: x.Balance,
                    Apr: x.Apr,
                    MonthlyFee: x.MonthlyFee,
                    MinPayment: x.MinPayment,
                    TermMonths: x.TermMonths,
                    OpenedAt: x.OpenedAt,
                    Status: x.Status,
                    ClosedAt: x.ClosedAt,
                    ClosedReason: x.ClosedReason,
                    SortOrder: index))
                .ToList();

            var inserted = await _materializationRepo.InsertBudgetMonthDebtsIdempotentAsync(
                budgetMonthId,
                debtInserts,
                actorPersoid,
                now,
                ct);

            didMaterializeAnything = didMaterializeAnything || inserted > 0;
        }

        return Result<bool>.Success(didMaterializeAnything);
    }

    private static string NormalizeIncomePaymentDayType(string? incomePaymentDayType)
    {
        var normalized = incomePaymentDayType?.Trim();

        return normalized switch
        {
            LastDayOfMonth => LastDayOfMonth,
            DayOfMonth => DayOfMonth,
            _ => DayOfMonth
        };
    }

    private static int? NormalizeIncomePaymentDay(string incomePaymentDayType, int? incomePaymentDay)
    {
        if (incomePaymentDayType != DayOfMonth)
            return null;

        return incomePaymentDay is >= 1 and <= 28
            ? incomePaymentDay
            : null;
    }
}
