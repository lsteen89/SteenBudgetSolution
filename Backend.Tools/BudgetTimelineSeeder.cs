using System.Data.Common;
using System.Globalization;
using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.StartBudgetMonth;
using MediatR;

public sealed class BudgetTimelineSeeder
{
    private readonly IUnitOfWork _uow;
    private readonly IMediator _mediator;
    private readonly IBudgetMonthLifecycleService _monthLifecycle;
    private readonly IBudgetMonthCloseSnapshotService _closeSnapshot;
    private readonly ITimeProvider _clock;

    public BudgetTimelineSeeder(
        IUnitOfWork uow,
        IMediator mediator,
        IBudgetMonthLifecycleService monthLifecycle,
        IBudgetMonthCloseSnapshotService closeSnapshot,
        ITimeProvider clock)
    {
        _uow = uow;
        _mediator = mediator;
        _monthLifecycle = monthLifecycle;
        _closeSnapshot = closeSnapshot;
        _clock = clock;
    }

    public async Task SeedThreeMonthTimelineAsync(
        Guid persoid,
        string openYearMonth,
        CancellationToken ct,
        decimal? openMonthTargetFinalBalance = null)
    {
        Guid budgetId = Guid.Empty;

        await RunInTransactionAsync(
            async () =>
            {
                budgetId = await EnsureBaselineBudgetAsync(persoid, ct);
                await EnsureNoExistingMonthsAsync(budgetId, ct);
            },
            ct);

        var anchor = ParseYearMonthStartUtc(openYearMonth);
        var oldestYm = anchor.AddMonths(-2).ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var middleYm = anchor.AddMonths(-1).ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var openYm = anchor.ToString("yyyy-MM", CultureInfo.InvariantCulture);

        await StartMonthAsync(
            persoid,
            oldestYm,
            closePreviousOpenMonth: false,
            carryOverMode: BudgetMonthCarryOverModes.None,
            ct);

        await RunInTransactionAsync(
            async () =>
            {
                var oldest = await EnsureMaterializedMonthAsync(persoid, oldestYm, ct);
                await ApplyMonthScenarioAsync(oldest.BudgetMonthId, persoid, oldestYm, BudgetTimelineScenarioData.Oldest, ct);
            },
            ct);

        await StartMonthAsync(
            persoid,
            middleYm,
            closePreviousOpenMonth: true,
            carryOverMode: BudgetMonthCarryOverModes.Full,
            ct);

        await RunInTransactionAsync(
            async () =>
            {
                var middle = await EnsureMaterializedMonthAsync(persoid, middleYm, ct);
                await ApplyMonthScenarioAsync(middle.BudgetMonthId, persoid, middleYm, BudgetTimelineScenarioData.Middle, ct);
            },
            ct);

        await StartMonthAsync(
            persoid,
            openYm,
            closePreviousOpenMonth: true,
            carryOverMode: BudgetMonthCarryOverModes.Full,
            ct);

        await RunInTransactionAsync(
            async () =>
            {
                var open = await EnsureMaterializedMonthAsync(persoid, openYm, ct);
                await ApplyMonthScenarioAsync(open.BudgetMonthId, persoid, openYm, BudgetTimelineScenarioData.Open, ct);

                if (openMonthTargetFinalBalance.HasValue)
                {
                    await AdjustOpenMonthFinalBalanceAsync(
                        open.BudgetMonthId,
                        persoid,
                        openMonthTargetFinalBalance.Value,
                        ParseYearMonthStartUtc(openYm).AddDays(4).AddHours(17),
                        ct);
                }
            },
            ct);
    }

    private async Task RunInTransactionAsync(Func<Task> action, CancellationToken ct)
    {
        var startedTransaction = false;

        try
        {
            if (!_uow.IsInTransaction)
            {
                await _uow.BeginTransactionAsync(ct);
                startedTransaction = true;
            }

            await action();

            if (startedTransaction)
                await _uow.CommitAsync(ct);
        }
        catch
        {
            if (startedTransaction && _uow.IsInTransaction)
                await _uow.RollbackAsync(ct);

            throw;
        }
    }

    private async Task<Guid> EnsureBaselineBudgetAsync(Guid persoid, CancellationToken ct)
    {
        var existingBudgetId = await QueryGuidAsync(
            "SELECT Id FROM Budget WHERE Persoid = @Persoid LIMIT 1;",
            new Dictionary<string, object?> { ["Persoid"] = persoid },
            ct);

        var budgetId = existingBudgetId ?? Guid.NewGuid();

        if (!existingBudgetId.HasValue)
        {
            await ExecuteAsync(
                @"INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedByUserId)
                  VALUES (@BudgetId, @Persoid, 'snowball', @Persoid);",
                new Dictionary<string, object?>
                {
                    ["BudgetId"] = budgetId,
                    ["Persoid"] = persoid
                },
                ct);
        }

        await EnsureExpenseCategoriesAsync(ct);
        await EnsureBaselineIncomeAsync(budgetId, persoid, ct);
        await EnsureBaselineExpensesAsync(budgetId, persoid, ct);
        await EnsureBaselineSavingsAsync(budgetId, persoid, ct);
        await EnsureBaselineDebtsAsync(budgetId, persoid, ct);

        return budgetId;
    }

    private async Task EnsureExpenseCategoriesAsync(CancellationToken ct)
    {
        await ExecuteAsync(
            @"INSERT IGNORE INTO ExpenseCategory (Id, Name) VALUES
                (@Housing, 'Rent'),
                (@Food, 'Food'),
                (@Transport, 'Transport'),
                (@Fixed, 'FixedExpense'),
                (@Subscription, 'Subscription');",
            new Dictionary<string, object?>
            {
                ["Housing"] = BudgetTimelineBaselineData.HousingCategoryId,
                ["Food"] = BudgetTimelineBaselineData.FoodCategoryId,
                ["Transport"] = BudgetTimelineBaselineData.TransportCategoryId,
                ["Fixed"] = BudgetTimelineBaselineData.FixedExpenseCategoryId,
                ["Subscription"] = BudgetTimelineBaselineData.SubscriptionCategoryId
            },
            ct);
    }

    private async Task EnsureBaselineIncomeAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        var count = await QueryIntAsync(
            "SELECT COUNT(*) FROM Income WHERE BudgetId = @BudgetId;",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (count > 0)
            return;

        var incomeId = Guid.NewGuid();
        var income = BudgetTimelineBaselineData.Income;

        await ExecuteAsync(
            @"INSERT INTO Income
              (
                  Id,
                  BudgetId,
                  NetSalaryMonthly,
                  SalaryFrequency,
                  IncomePaymentDayType,
                  IncomePaymentDay,
                  CreatedByUserId
              )
              VALUES
              (
                  @IncomeId,
                  @BudgetId,
                  @NetSalaryMonthly,
                  @SalaryFrequency,
                  @IncomePaymentDayType,
                  @IncomePaymentDay,
                  @Persoid
              );",
            new Dictionary<string, object?>
            {
                ["IncomeId"] = incomeId,
                ["BudgetId"] = budgetId,
                ["NetSalaryMonthly"] = income.NetSalaryMonthly,
                ["SalaryFrequency"] = (int)income.SalaryFrequency,
                ["IncomePaymentDayType"] = income.IncomePaymentDayType,
                ["IncomePaymentDay"] = income.IncomePaymentDay,
                ["Persoid"] = persoid
            },
            ct);

        foreach (var sideHustle in income.SideHustles)
        {
            await ExecuteAsync(
                @"INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
                  VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @Persoid);",
                new Dictionary<string, object?>
                {
                    ["Id"] = Guid.NewGuid(),
                    ["IncomeId"] = incomeId,
                    ["Name"] = sideHustle.Name,
                    ["IncomeMonthly"] = sideHustle.AmountMonthly,
                    ["Frequency"] = (int)sideHustle.Frequency,
                    ["Persoid"] = persoid
                },
                ct);
        }

        foreach (var householdMember in income.HouseholdMembers)
        {
            await ExecuteAsync(
                @"INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
                  VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @Persoid);",
                new Dictionary<string, object?>
                {
                    ["Id"] = Guid.NewGuid(),
                    ["IncomeId"] = incomeId,
                    ["Name"] = householdMember.Name,
                    ["IncomeMonthly"] = householdMember.AmountMonthly,
                    ["Frequency"] = (int)householdMember.Frequency,
                    ["Persoid"] = persoid
                },
                ct);
        }
    }

    private async Task EnsureBaselineExpensesAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        foreach (var expense in BudgetTimelineBaselineData.Expenses)
        {
            await EnsureExpenseItemExistsAsync(
                budgetId,
                persoid,
                expense.CategoryId,
                expense.Name,
                expense.AmountMonthly,
                ct);
        }
    }

    private Task EnsureExpenseItemExistsAsync(
        Guid budgetId,
        Guid persoid,
        Guid categoryId,
        string name,
        decimal amount,
        CancellationToken ct)
    {
        return ExecuteAsync(
            @"INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedByUserId)
              SELECT @Id, @BudgetId, @CategoryId, @Name, @Amount, @Persoid
              FROM DUAL
              WHERE NOT EXISTS (
                SELECT 1
                FROM ExpenseItem
                WHERE BudgetId = @BudgetId
                  AND Name = @Name
                LIMIT 1
              );",
            new Dictionary<string, object?>
            {
                ["Id"] = Guid.NewGuid(),
                ["BudgetId"] = budgetId,
                ["CategoryId"] = categoryId,
                ["Name"] = name,
                ["Amount"] = amount,
                ["Persoid"] = persoid
            },
            ct);
    }

    private async Task EnsureBaselineSavingsAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        var count = await QueryIntAsync(
            "SELECT COUNT(*) FROM Savings WHERE BudgetId = @BudgetId;",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (count > 0)
            return;

        var savingsId = Guid.NewGuid();
        var savings = BudgetTimelineBaselineData.Savings;
        var anchor = new DateTime(_clock.UtcNow.Year, _clock.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        await ExecuteAsync(
            @"INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedByUserId)
              VALUES (@SavingsId, @BudgetId, @MonthlySavings, @Persoid);",
            new Dictionary<string, object?>
            {
                ["SavingsId"] = savingsId,
                ["BudgetId"] = budgetId,
                ["MonthlySavings"] = savings.MonthlySavings,
                ["Persoid"] = persoid
            },
            ct);

        foreach (var goal in savings.Goals)
        {
            await ExecuteAsync(
                @"INSERT INTO SavingsGoal
                  (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, MonthlyContribution, CreatedByUserId)
                  VALUES
                  (@GoalId, @SavingsId, @Name, @TargetAmount, @TargetDate, @AmountSaved, @MonthlyContribution, @Persoid);",
                new Dictionary<string, object?>
                {
                    ["GoalId"] = Guid.NewGuid(),
                    ["SavingsId"] = savingsId,
                    ["Name"] = goal.Name,
                    ["TargetAmount"] = goal.TargetAmount,
                    ["TargetDate"] = anchor.AddMonths(goal.TargetMonthOffset).Date,
                    ["AmountSaved"] = goal.AmountSaved,
                    ["MonthlyContribution"] = goal.MonthlyContribution,
                    ["Persoid"] = persoid
                },
                ct);
        }
    }

    private async Task EnsureBaselineDebtsAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        var count = await QueryIntAsync(
            "SELECT COUNT(*) FROM Debt WHERE BudgetId = @BudgetId AND Status = 'active';",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (count > 0)
            return;

        foreach (var debt in BudgetTimelineBaselineData.Debts)
        {
            await ExecuteAsync(
                @"INSERT INTO Debt
                  (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, CreatedByUserId)
                  VALUES
                  (@Id, @BudgetId, @Name, @Type, @Balance, @Apr, @MonthlyFee, @MinPayment, @TermMonths, @Persoid);",
                new Dictionary<string, object?>
                {
                    ["Id"] = Guid.NewGuid(),
                    ["BudgetId"] = budgetId,
                    ["Name"] = debt.Name,
                    ["Type"] = debt.Type,
                    ["Balance"] = debt.Balance,
                    ["Apr"] = debt.Apr,
                    ["MonthlyFee"] = debt.MonthlyFee,
                    ["MinPayment"] = debt.MinPayment,
                    ["TermMonths"] = debt.TermMonths,
                    ["Persoid"] = persoid
                },
                ct);
        }
    }

    private async Task EnsureNoExistingMonthsAsync(Guid budgetId, CancellationToken ct)
    {
        var monthsCount = await QueryIntAsync(
            "SELECT COUNT(*) FROM BudgetMonth WHERE BudgetId = @BudgetId;",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (monthsCount > 0)
        {
            throw new InvalidOperationException(
                "Budget already has month rows. Refusing to append seed months to existing timeline.");
        }
    }

    private async Task StartMonthAsync(
        Guid persoid,
        string targetYearMonth,
        bool closePreviousOpenMonth,
        string carryOverMode,
        CancellationToken ct)
    {
        var request = new StartBudgetMonthRequestDto(
            TargetYearMonth: targetYearMonth,
            ClosePreviousOpenMonth: closePreviousOpenMonth,
            CarryOverMode: carryOverMode,
            CarryOverAmount: null,
            CreateSkippedMonths: false);

        var result = await _mediator.Send(
            new StartBudgetMonthCommand(persoid, persoid, request),
            ct);

        if (result.IsFailure)
        {
            throw new InvalidOperationException(
                $"Could not create month {targetYearMonth}: {result.Error.Code} - {result.Error.Description}");
        }
    }

    private async Task<EnsureBudgetMonthLifecycleResult> EnsureMaterializedMonthAsync(
        Guid persoid,
        string yearMonth,
        CancellationToken ct)
    {
        var result = await _monthLifecycle.EnsureAccessibleMonthAsync(
            persoid,
            persoid,
            yearMonth,
            ct);

        if (result.IsFailure || result.Value is null)
        {
            throw new InvalidOperationException(
                $"Could not materialize month {yearMonth}: {result.Error.Code} - {result.Error.Description}");
        }

        return result.Value;
    }

    private async Task ApplyMonthScenarioAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string yearMonth,
        BudgetTimelineMonthScenario scenario,
        CancellationToken ct)
    {
        var changedAtBase = ParseYearMonthStartUtc(yearMonth).AddDays(4).AddHours(9);
        var sequence = 0;

        DateTime NextChangedAtUtc() => changedAtBase.AddMinutes(sequence++ * 19);

        foreach (var change in scenario.ExpenseAmountOverrides)
        {
            await OverrideExpenseAmountAsync(
                budgetMonthId,
                actorPersoid,
                change.Name,
                change.NewAmount,
                NextChangedAtUtc(),
                ct);
        }

        foreach (var createdExpense in scenario.CreatedExpenses)
        {
            await CreateMonthExpenseAsync(
                budgetMonthId,
                actorPersoid,
                createdExpense.CategoryId,
                createdExpense.Name,
                createdExpense.AmountMonthly,
                createdExpense.IsActive,
                NextChangedAtUtc(),
                ct);
        }

        foreach (var change in scenario.ExpenseActivityChanges)
        {
            await SetExpenseActiveStateAsync(
                budgetMonthId,
                actorPersoid,
                change.Name,
                change.IsActive,
                NextChangedAtUtc(),
                ct);
        }

        foreach (var deletedExpense in scenario.DeletedExpenses)
        {
            await SoftDeleteExpenseAsync(
                budgetMonthId,
                actorPersoid,
                deletedExpense,
                NextChangedAtUtc(),
                ct);
        }

        foreach (var change in scenario.SideHustleAmountOverrides)
        {
            await OverrideSideHustleAmountAsync(
                budgetMonthId,
                actorPersoid,
                change.Name,
                change.NewAmount,
                NextChangedAtUtc(),
                ct);
        }

        foreach (var change in scenario.HouseholdMemberAmountOverrides)
        {
            await OverrideHouseholdMemberAmountAsync(
                budgetMonthId,
                actorPersoid,
                change.Name,
                change.NewAmount,
                NextChangedAtUtc(),
                ct);
        }

        if (scenario.SavingsMonthlyOverride.HasValue)
        {
            await OverrideSavingsMonthlyAsync(
                budgetMonthId,
                actorPersoid,
                scenario.SavingsMonthlyOverride.Value,
                NextChangedAtUtc(),
                ct);
        }

        foreach (var change in scenario.SavingsGoalAdjustments)
        {
            await OverrideSavingsGoalAsync(
                budgetMonthId,
                actorPersoid,
                change.Name,
                change.MonthlyContribution,
                change.AmountSaved,
                NextChangedAtUtc(),
                ct);
        }

        foreach (var change in scenario.DebtAdjustments)
        {
            await OverrideDebtAsync(
                budgetMonthId,
                actorPersoid,
                change.Name,
                change.Balance,
                change.MinPayment,
                change.MonthlyFee,
                NextChangedAtUtc(),
                ct);
        }
    }

    private async Task AdjustOpenMonthFinalBalanceAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        decimal targetFinalBalance,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var snapshot = await _closeSnapshot.ComputeAsync(budgetMonthId, carryOverAmount: 0m, ct);
        if (snapshot is null)
        {
            throw new InvalidOperationException(
                $"Could not compute E2E final balance for month {budgetMonthId}.");
        }

        var adjustmentExpense = Math.Round(
            snapshot.FinalBalance - targetFinalBalance,
            2,
            MidpointRounding.AwayFromZero);

        if (adjustmentExpense < 0m)
        {
            throw new InvalidOperationException(
                $"E2E target balance {targetFinalBalance} is above current final balance {snapshot.FinalBalance}; seed adjustment only supports adding expenses.");
        }

        if (adjustmentExpense > 0m)
        {
            await CreateMonthExpenseAsync(
                budgetMonthId,
                actorPersoid,
                BudgetTimelineBaselineData.FixedExpenseCategoryId,
                "E2E Balance Adjustment",
                adjustmentExpense,
                isActive: true,
                changedAtUtc,
                ct);
        }

        var updatedSnapshot = await _closeSnapshot.ComputeAsync(budgetMonthId, carryOverAmount: 0m, ct);
        if (updatedSnapshot is null || Math.Abs(updatedSnapshot.FinalBalance - targetFinalBalance) > 0.01m)
        {
            throw new InvalidOperationException(
                $"E2E final balance adjustment failed. Target={targetFinalBalance}, Actual={updatedSnapshot?.FinalBalance}.");
        }
    }

    private async Task OverrideExpenseAmountAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string expenseName,
        decimal newAmount,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var existing = await GetExpenseRowAsync(budgetMonthId, expenseName, includeDeleted: false, ct);

        if (existing.AmountMonthly == newAmount)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthExpenseItem
              SET AmountMonthly = @AmountMonthly,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["AmountMonthly"] = newAmount,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = existing.Id
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "expense-item",
            entityId: existing.Id,
            sourceEntityId: existing.SourceEntityId,
            changeType: "updated",
            changeSet: new
            {
                before = new
                {
                    existing.Name,
                    existing.AmountMonthly,
                    existing.IsActive
                },
                after = new
                {
                    existing.Name,
                    AmountMonthly = newAmount,
                    existing.IsActive
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task SetExpenseActiveStateAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string expenseName,
        bool isActive,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var existing = await GetExpenseRowAsync(budgetMonthId, expenseName, includeDeleted: false, ct);

        if (existing.IsActive == isActive)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthExpenseItem
              SET IsActive = @IsActive,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["IsActive"] = isActive,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = existing.Id
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "expense-item",
            entityId: existing.Id,
            sourceEntityId: existing.SourceEntityId,
            changeType: "updated",
            changeSet: new
            {
                before = new
                {
                    existing.Name,
                    existing.AmountMonthly,
                    existing.IsActive
                },
                after = new
                {
                    existing.Name,
                    existing.AmountMonthly,
                    IsActive = isActive
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task SoftDeleteExpenseAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string expenseName,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var existing = await GetExpenseRowAsync(budgetMonthId, expenseName, includeDeleted: false, ct);

        await ExecuteAsync(
            @"UPDATE BudgetMonthExpenseItem
              SET IsDeleted = 1,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = existing.Id
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "expense-item",
            entityId: existing.Id,
            sourceEntityId: existing.SourceEntityId,
            changeType: "deleted",
            changeSet: new
            {
                deletedEntity = new
                {
                    existing.Id,
                    existing.SourceEntityId,
                    existing.Name,
                    existing.AmountMonthly,
                    existing.IsActive
                },
                flags = new
                {
                    isDeleted = new
                    {
                        oldValue = false,
                        newValue = true
                    }
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task CreateMonthExpenseAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        Guid categoryId,
        string name,
        decimal amountMonthly,
        bool isActive,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var entityId = Guid.NewGuid();
        var sortOrder = await QueryIntAsync(
            @"SELECT COALESCE(MAX(SortOrder), -1) + 1
              FROM BudgetMonthExpenseItem
              WHERE BudgetMonthId = @BudgetMonthId;",
            new Dictionary<string, object?>
            {
                ["BudgetMonthId"] = budgetMonthId
            },
            ct);

        await ExecuteAsync(
            @"INSERT INTO BudgetMonthExpenseItem
              (
                  Id,
                  BudgetMonthId,
                  SourceExpenseItemId,
                  CategoryId,
                  Name,
                  AmountMonthly,
                  IsActive,
                  IsDeleted,
                  SortOrder,
                  CreatedAt,
                  CreatedByUserId
              )
              VALUES
              (
                  @Id,
                  @BudgetMonthId,
                  NULL,
                  @CategoryId,
                  @Name,
                  @AmountMonthly,
                  @IsActive,
                  0,
                  @SortOrder,
                  @ChangedAtUtc,
                  @ActorPersoid
              );",
            new Dictionary<string, object?>
            {
                ["Id"] = entityId,
                ["BudgetMonthId"] = budgetMonthId,
                ["CategoryId"] = categoryId,
                ["Name"] = name,
                ["AmountMonthly"] = amountMonthly,
                ["IsActive"] = isActive,
                ["SortOrder"] = sortOrder,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "expense-item",
            entityId: entityId,
            sourceEntityId: null,
            changeType: "created",
            changeSet: new
            {
                createdEntity = new
                {
                    Id = entityId,
                    CategoryId = categoryId,
                    Name = name,
                    AmountMonthly = amountMonthly,
                    IsActive = isActive,
                    IsMonthOnly = true
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task OverrideSideHustleAmountAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string name,
        decimal newAmount,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var existing = await GetIncomeListRowAsync(
            tableName: "BudgetMonthIncomeSideHustle",
            sourceColumnName: "SourceSideHustleId",
            budgetMonthId: budgetMonthId,
            name: name,
            includeDeleted: false,
            ct: ct);

        if (existing.Amount == newAmount)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthIncomeSideHustle
              SET IncomeMonthly = @IncomeMonthly,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["IncomeMonthly"] = newAmount,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = existing.Id
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "income-side-hustle",
            entityId: existing.Id,
            sourceEntityId: existing.SourceEntityId,
            changeType: "updated",
            changeSet: new
            {
                before = new
                {
                    existing.Name,
                    IncomeMonthly = existing.Amount,
                    existing.IsActive
                },
                after = new
                {
                    existing.Name,
                    IncomeMonthly = newAmount,
                    existing.IsActive
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task OverrideHouseholdMemberAmountAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string name,
        decimal newAmount,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var existing = await GetIncomeListRowAsync(
            tableName: "BudgetMonthIncomeHouseholdMember",
            sourceColumnName: "SourceHouseholdMemberId",
            budgetMonthId: budgetMonthId,
            name: name,
            includeDeleted: false,
            ct: ct);

        if (existing.Amount == newAmount)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthIncomeHouseholdMember
              SET IncomeMonthly = @IncomeMonthly,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["IncomeMonthly"] = newAmount,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = existing.Id
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "income-household-member",
            entityId: existing.Id,
            sourceEntityId: existing.SourceEntityId,
            changeType: "updated",
            changeSet: new
            {
                before = new
                {
                    existing.Name,
                    IncomeMonthly = existing.Amount,
                    existing.IsActive
                },
                after = new
                {
                    existing.Name,
                    IncomeMonthly = newAmount,
                    existing.IsActive
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task OverrideSavingsMonthlyAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        decimal newAmount,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var lookup = conn.CreateCommand();
        lookup.Transaction = _uow.Transaction;
        lookup.CommandText = @"
            SELECT
                Id,
                SourceSavingsId,
                MonthlySavings
            FROM BudgetMonthSavings
            WHERE BudgetMonthId = @BudgetMonthId
              AND IsDeleted = 0
            LIMIT 1;";

        AddParameter(lookup, "BudgetMonthId", budgetMonthId);

        Guid entityId;
        Guid? sourceEntityId;
        decimal oldAmount;

        await using (var reader = await lookup.ExecuteReaderAsync(ct))
        {
            if (!await reader.ReadAsync(ct))
            {
                throw new InvalidOperationException(
                    $"Could not find savings row in month {budgetMonthId}.");
            }

            entityId = reader.GetGuid(0);
            sourceEntityId = reader.IsDBNull(1) ? null : reader.GetGuid(1);
            oldAmount = reader.GetDecimal(2);
        }

        if (oldAmount == newAmount)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthSavings
              SET MonthlySavings = @MonthlySavings,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["MonthlySavings"] = newAmount,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = entityId
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "savings",
            entityId: entityId,
            sourceEntityId: sourceEntityId,
            changeType: "updated",
            changeSet: new
            {
                before = new
                {
                    MonthlySavings = oldAmount
                },
                after = new
                {
                    MonthlySavings = newAmount
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task OverrideSavingsGoalAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string goalName,
        decimal? monthlyContribution,
        decimal? amountSaved,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var lookup = conn.CreateCommand();
        lookup.Transaction = _uow.Transaction;
        lookup.CommandText = @"
            SELECT
                g.Id,
                g.SourceSavingsGoalId,
                g.MonthlyContribution,
                g.AmountSaved
            FROM BudgetMonthSavingsGoal g
            INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
            WHERE s.BudgetMonthId = @BudgetMonthId
              AND g.Name = @GoalName
              AND g.IsDeleted = 0
            ORDER BY g.CreatedAt
            LIMIT 1;";

        AddParameter(lookup, "BudgetMonthId", budgetMonthId);
        AddParameter(lookup, "GoalName", goalName);

        Guid entityId;
        Guid? sourceEntityId;
        decimal oldContribution;
        decimal? oldAmountSaved;

        await using (var reader = await lookup.ExecuteReaderAsync(ct))
        {
            if (!await reader.ReadAsync(ct))
            {
                throw new InvalidOperationException(
                    $"Could not find savings goal '{goalName}' in month {budgetMonthId}.");
            }

            entityId = reader.GetGuid(0);
            sourceEntityId = reader.IsDBNull(1) ? null : reader.GetGuid(1);
            oldContribution = reader.GetDecimal(2);
            oldAmountSaved = reader.IsDBNull(3) ? null : reader.GetDecimal(3);
        }

        var newContribution = monthlyContribution ?? oldContribution;
        var newAmountSaved = amountSaved ?? oldAmountSaved;

        if (oldContribution == newContribution && oldAmountSaved == newAmountSaved)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthSavingsGoal
              SET MonthlyContribution = @MonthlyContribution,
                  AmountSaved = @AmountSaved,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["MonthlyContribution"] = newContribution,
                ["AmountSaved"] = newAmountSaved,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = entityId
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "savings-goal",
            entityId: entityId,
            sourceEntityId: sourceEntityId,
            changeType: "updated",
            changeSet: new
            {
                before = new
                {
                    Name = goalName,
                    MonthlyContribution = oldContribution,
                    AmountSaved = oldAmountSaved
                },
                after = new
                {
                    Name = goalName,
                    MonthlyContribution = newContribution,
                    AmountSaved = newAmountSaved
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task OverrideDebtAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string debtName,
        decimal? balance,
        decimal? minPayment,
        decimal? monthlyFee,
        DateTime changedAtUtc,
        CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var lookup = conn.CreateCommand();
        lookup.Transaction = _uow.Transaction;
        lookup.CommandText = @"
            SELECT
                Id,
                SourceDebtId,
                Balance,
                MinPayment,
                MonthlyFee
            FROM BudgetMonthDebt
            WHERE BudgetMonthId = @BudgetMonthId
              AND Name = @DebtName
              AND IsDeleted = 0
            ORDER BY CreatedAt
            LIMIT 1;";

        AddParameter(lookup, "BudgetMonthId", budgetMonthId);
        AddParameter(lookup, "DebtName", debtName);

        Guid entityId;
        Guid? sourceEntityId;
        decimal oldBalance;
        decimal? oldMinPayment;
        decimal? oldMonthlyFee;

        await using (var reader = await lookup.ExecuteReaderAsync(ct))
        {
            if (!await reader.ReadAsync(ct))
            {
                throw new InvalidOperationException(
                    $"Could not find debt '{debtName}' in month {budgetMonthId}.");
            }

            entityId = reader.GetGuid(0);
            sourceEntityId = reader.IsDBNull(1) ? null : reader.GetGuid(1);
            oldBalance = reader.GetDecimal(2);
            oldMinPayment = reader.IsDBNull(3) ? null : reader.GetDecimal(3);
            oldMonthlyFee = reader.IsDBNull(4) ? null : reader.GetDecimal(4);
        }

        var newBalance = balance ?? oldBalance;
        var newMinPayment = minPayment ?? oldMinPayment;
        var newMonthlyFee = monthlyFee ?? oldMonthlyFee;

        if (oldBalance == newBalance && oldMinPayment == newMinPayment && oldMonthlyFee == newMonthlyFee)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthDebt
              SET Balance = @Balance,
                  MinPayment = @MinPayment,
                  MonthlyFee = @MonthlyFee,
                  IsOverride = 1,
                  UpdatedAt = @ChangedAtUtc,
                  UpdatedByUserId = @ActorPersoid
              WHERE Id = @EntityId;",
            new Dictionary<string, object?>
            {
                ["Balance"] = newBalance,
                ["MinPayment"] = newMinPayment,
                ["MonthlyFee"] = newMonthlyFee,
                ["ChangedAtUtc"] = changedAtUtc,
                ["ActorPersoid"] = actorPersoid,
                ["EntityId"] = entityId
            },
            ct);

        await InsertBudgetMonthChangeEventAsync(
            budgetMonthId: budgetMonthId,
            entityType: "debt",
            entityId: entityId,
            sourceEntityId: sourceEntityId,
            changeType: "updated",
            changeSet: new
            {
                before = new
                {
                    Name = debtName,
                    Balance = oldBalance,
                    MinPayment = oldMinPayment,
                    MonthlyFee = oldMonthlyFee
                },
                after = new
                {
                    Name = debtName,
                    Balance = newBalance,
                    MinPayment = newMinPayment,
                    MonthlyFee = newMonthlyFee
                }
            },
            changedByUserId: actorPersoid,
            changedAtUtc: changedAtUtc,
            ct: ct);
    }

    private async Task<BudgetTimelineExpenseMonthRow> GetExpenseRowAsync(
        Guid budgetMonthId,
        string expenseName,
        bool includeDeleted,
        CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var lookup = conn.CreateCommand();
        lookup.Transaction = _uow.Transaction;
        lookup.CommandText = $@"
            SELECT
                Id,
                SourceExpenseItemId,
                Name,
                AmountMonthly,
                IsActive
            FROM BudgetMonthExpenseItem
            WHERE BudgetMonthId = @BudgetMonthId
              AND Name = @ExpenseName
              {(includeDeleted ? string.Empty : "AND IsDeleted = 0")}
            ORDER BY CreatedAt
            LIMIT 1;";

        AddParameter(lookup, "BudgetMonthId", budgetMonthId);
        AddParameter(lookup, "ExpenseName", expenseName);

        await using var reader = await lookup.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            throw new InvalidOperationException(
                $"Could not find month expense '{expenseName}' in month {budgetMonthId}.");
        }

        return new BudgetTimelineExpenseMonthRow(
            Id: reader.GetGuid(0),
            SourceEntityId: reader.IsDBNull(1) ? null : reader.GetGuid(1),
            Name: reader.GetString(2),
            AmountMonthly: reader.GetDecimal(3),
            IsActive: reader.GetBoolean(4));
    }

    private async Task<BudgetTimelineIncomeMonthRow> GetIncomeListRowAsync(
        string tableName,
        string sourceColumnName,
        Guid budgetMonthId,
        string name,
        bool includeDeleted,
        CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var lookup = conn.CreateCommand();
        lookup.Transaction = _uow.Transaction;
        lookup.CommandText = $@"
            SELECT
                i.Id,
                i.{sourceColumnName},
                i.Name,
                i.IncomeMonthly,
                i.IsActive
            FROM {tableName} i
            INNER JOIN BudgetMonthIncome bmi ON bmi.Id = i.BudgetMonthIncomeId
            WHERE bmi.BudgetMonthId = @BudgetMonthId
              AND i.Name = @Name
              {(includeDeleted ? string.Empty : "AND i.IsDeleted = 0")}
            ORDER BY i.CreatedAt
            LIMIT 1;";

        AddParameter(lookup, "BudgetMonthId", budgetMonthId);
        AddParameter(lookup, "Name", name);

        await using var reader = await lookup.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            throw new InvalidOperationException(
                $"Could not find income row '{name}' in month {budgetMonthId}.");
        }

        return new BudgetTimelineIncomeMonthRow(
            Id: reader.GetGuid(0),
            SourceEntityId: reader.IsDBNull(1) ? null : reader.GetGuid(1),
            Name: reader.GetString(2),
            Amount: reader.GetDecimal(3),
            IsActive: reader.GetBoolean(4));
    }

    private static DateTime ParseYearMonthStartUtc(string yearMonth)
    {
        return DateTime.ParseExact(
            $"{yearMonth}-01",
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);
    }

    private async Task<int> QueryIntAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var scalar = await ExecuteScalarAsync(sql, parameters, ct);
        return Convert.ToInt32(scalar, CultureInfo.InvariantCulture);
    }

    private async Task<Guid?> QueryGuidAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var scalar = await ExecuteScalarAsync(sql, parameters, ct);
        if (scalar is null || scalar == DBNull.Value)
            return null;

        if (scalar is Guid guid)
            return guid;

        if (scalar is byte[] bytes && bytes.Length == 16)
            return new Guid(bytes);

        if (Guid.TryParse(Convert.ToString(scalar, CultureInfo.InvariantCulture), out var parsed))
            return parsed;

        return null;
    }

    private async Task<object?> ExecuteScalarAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = _uow.Transaction;
        cmd.CommandText = sql;

        foreach (var pair in parameters)
            AddParameter(cmd, pair.Key, pair.Value);

        return await cmd.ExecuteScalarAsync(ct);
    }

    private async Task<int> ExecuteAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = _uow.Transaction;
        cmd.CommandText = sql;

        foreach (var pair in parameters)
            AddParameter(cmd, pair.Key, pair.Value);

        return await cmd.ExecuteNonQueryAsync(ct);
    }

    private static void AddParameter(DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = "@" + name;
        p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }

    private Task InsertBudgetMonthChangeEventAsync(
        Guid budgetMonthId,
        string entityType,
        Guid entityId,
        Guid? sourceEntityId,
        string changeType,
        object? changeSet,
        Guid changedByUserId,
        CancellationToken ct,
        object? metadata = null,
        DateTime? changedAtUtc = null)
    {
        const string sql = @"
    INSERT INTO BudgetMonthChangeEvent
    (
        Id,
        BudgetMonthId,
        EntityType,
        EntityId,
        SourceEntityId,
        ChangeType,
        ChangeSetJson,
        MetadataJson,
        ChangedAt,
        ChangedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthId,
        @EntityType,
        @EntityId,
        @SourceEntityId,
        @ChangeType,
        @ChangeSetJson,
        @MetadataJson,
        @ChangedAt,
        @ChangedByUserId
    );";

        return ExecuteAsync(
            sql,
            new Dictionary<string, object?>
            {
                ["Id"] = Guid.NewGuid(),
                ["BudgetMonthId"] = budgetMonthId,
                ["EntityType"] = entityType,
                ["EntityId"] = entityId,
                ["SourceEntityId"] = sourceEntityId,
                ["ChangeType"] = changeType,
                ["ChangeSetJson"] = changeSet is null ? null : JsonSerializer.Serialize(changeSet),
                ["MetadataJson"] = metadata is null ? null : JsonSerializer.Serialize(metadata),
                ["ChangedAt"] = changedAtUtc ?? DateTime.UtcNow,
                ["ChangedByUserId"] = changedByUserId
            },
            ct);
    }
}

internal sealed record BudgetTimelineExpenseMonthRow(
    Guid Id,
    Guid? SourceEntityId,
    string Name,
    decimal AmountMonthly,
    bool IsActive);

internal sealed record BudgetTimelineIncomeMonthRow(
    Guid Id,
    Guid? SourceEntityId,
    string Name,
    decimal Amount,
    bool IsActive);
