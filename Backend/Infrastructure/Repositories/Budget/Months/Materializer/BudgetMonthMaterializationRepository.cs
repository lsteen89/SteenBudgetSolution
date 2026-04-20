using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Models.Insert;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Abstractions;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget.Months.Materializer;

public sealed partial class BudgetMonthMaterializationRepository : SqlBase, IBudgetMonthMaterializationRepository
{
    public BudgetMonthMaterializationRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthMaterializationRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public async Task<bool> HasMaterializedIncomeAsync(Guid budgetMonthId, CancellationToken ct)
        => await QuerySingleAsync<bool>(
            HasMaterializedIncomeSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<Guid?> GetBudgetMonthIncomeIdAsync(Guid budgetMonthId, CancellationToken ct)
        => await QuerySingleOrDefaultAsync<Guid?>(
            GetBudgetMonthIncomeIdSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task InsertBudgetMonthIncomeIdempotentAsync(
        Guid id,
        Guid budgetMonthId,
        Guid? sourceIncomeId,
        decimal netSalaryMonthly,
        int salaryFrequency,
        string incomePaymentDayType,
        int? incomePaymentDay,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(
            InsertBudgetMonthIncomeSql,
            new
            {
                Id = id,
                BudgetMonthId = budgetMonthId,
                SourceIncomeId = sourceIncomeId,
                NetSalaryMonthly = netSalaryMonthly,
                SalaryFrequency = salaryFrequency,
                IncomePaymentDayType = incomePaymentDayType,
                IncomePaymentDay = incomePaymentDay,
                ActorPersoid = actorPersoid,
                NowUtc = nowUtc
            },
            ct);

    public async Task<int> InsertBudgetMonthIncomeSideHustlesIdempotentAsync(
        Guid budgetMonthIncomeId,
        IReadOnlyList<BudgetMonthIncomeSideHustleSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        if (items.Count == 0)
            return 0;

        var rows = items.Select(x => new
        {
            x.Id,
            BudgetMonthIncomeId = budgetMonthIncomeId,
            x.SourceSideHustleId,
            x.Name,
            x.IncomeMonthly,
            x.Frequency,
            x.SortOrder,
            ActorPersoid = actorPersoid,
            NowUtc = nowUtc
        });

        return await ExecuteAsync(InsertBudgetMonthIncomeSideHustleSql, rows, ct);
    }

    public async Task<int> InsertBudgetMonthIncomeHouseholdMembersIdempotentAsync(
        Guid budgetMonthIncomeId,
        IReadOnlyList<BudgetMonthIncomeHouseholdMemberSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        if (items.Count == 0)
            return 0;

        var rows = items.Select(x => new
        {
            x.Id,
            BudgetMonthIncomeId = budgetMonthIncomeId,
            x.SourceHouseholdMemberId,
            x.Name,
            x.IncomeMonthly,
            x.Frequency,
            x.SortOrder,
            ActorPersoid = actorPersoid,
            NowUtc = nowUtc
        });

        return await ExecuteAsync(InsertBudgetMonthIncomeHouseholdMemberSql, rows, ct);
    }

    public async Task<int> InsertBudgetMonthExpenseItemsIdempotentAsync(
        Guid budgetMonthId,
        IReadOnlyList<BudgetMonthExpenseItemSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        if (items.Count == 0)
            return 0;

        var rows = items.Select(x => new
        {
            x.Id,
            BudgetMonthId = budgetMonthId,
            x.SourceExpenseItemId,
            x.CategoryId,
            x.Name,
            x.AmountMonthly,
            x.SortOrder,
            ActorPersoid = actorPersoid,
            NowUtc = nowUtc
        });

        return await ExecuteAsync(InsertBudgetMonthExpenseItemSql, rows, ct);
    }
    public async Task<bool> HasMaterializedSavingsAsync(Guid budgetMonthId, CancellationToken ct)
    => await QuerySingleAsync<bool>(
        HasMaterializedSavingsSql,
        new { BudgetMonthId = budgetMonthId },
        ct);

    public async Task<Guid?> GetBudgetMonthSavingsIdAsync(Guid budgetMonthId, CancellationToken ct)
        => await QuerySingleOrDefaultAsync<Guid?>(
            GetBudgetMonthSavingsIdSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task InsertBudgetMonthSavingsIdempotentAsync(
        Guid id,
        Guid budgetMonthId,
        Guid? sourceSavingsId,
        decimal monthlySavings,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(
            InsertBudgetMonthSavingsSql,
            new
            {
                Id = id,
                BudgetMonthId = budgetMonthId,
                SourceSavingsId = sourceSavingsId,
                MonthlySavings = monthlySavings,
                ActorPersoid = actorPersoid,
                NowUtc = nowUtc
            },
            ct);

    public async Task<int> InsertBudgetMonthSavingsGoalsIdempotentAsync(
        Guid budgetMonthSavingsId,
        IReadOnlyList<BudgetMonthSavingsGoalSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        if (items.Count == 0)
            return 0;

        var rows = items.Select(x => new
        {
            x.Id,
            BudgetMonthSavingsId = budgetMonthSavingsId,
            x.SourceSavingsGoalId,
            x.Name,
            x.TargetAmount,
            x.TargetDate,
            x.AmountSaved,
            x.MonthlyContribution,
            x.OpenedAt,
            x.Status,
            x.ClosedAt,
            x.ClosedReason,
            x.SortOrder,
            ActorPersoid = actorPersoid,
            NowUtc = nowUtc
        });

        return await ExecuteAsync(InsertBudgetMonthSavingsGoalSql, rows, ct);
    }

    public async Task<int> InsertBudgetMonthDebtsIdempotentAsync(
        Guid budgetMonthId,
        IReadOnlyList<BudgetMonthDebtSeedInsertModel> items,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        if (items.Count == 0)
            return 0;

        var rows = items.Select(x => new
        {
            x.Id,
            BudgetMonthId = budgetMonthId,
            x.SourceDebtId,
            x.Name,
            x.Type,
            x.Balance,
            x.Apr,
            x.MonthlyFee,
            x.MinPayment,
            x.TermMonths,
            x.OpenedAt,
            x.Status,
            x.ClosedAt,
            x.ClosedReason,
            x.SortOrder,
            ActorPersoid = actorPersoid,
            NowUtc = nowUtc
        });

        return await ExecuteAsync(InsertBudgetMonthDebtSql, rows, ct);
    }
}
