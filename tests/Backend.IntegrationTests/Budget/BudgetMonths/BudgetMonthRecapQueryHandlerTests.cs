using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Recap;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace Backend.IntegrationTests.Budget.BudgetMonths;

[Collection("it:db")]
public sealed class BudgetMonthRecapQueryHandlerTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthRecapQueryHandlerTests(MariaDbFixture db)
    {
        _db = db;
    }

    [Fact]
    public async Task ClosedMonth_ReturnsMetaCarryOverAndSnapshotTotals_FromBudgetMonthSnapshotColumns()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);

        await InsertClosedMonthWithSnapshotAsync(
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            createdByUserId: seed.UserId,
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.Custom,
            carryOverAmount: 777m,
            totalIncome: 101m,
            totalExpenses: 202m,
            totalSavings: 303m,
            totalDebtPayments: 404m,
            finalBalance: -808m);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be("2026-04");
        dto.Month.Status.Should().Be(BudgetMonthStatuses.Closed);
        dto.Month.OpenedAtUtc.Should().Be(new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc));
        dto.Month.ClosedAtUtc.Should().Be(new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc));
        dto.Month.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.Custom);
        dto.Month.CarryOverAmount.Should().Be(777m);

        dto.SnapshotTotals.TotalIncomeMonthly.Should().Be(101m);
        dto.SnapshotTotals.TotalExpensesMonthly.Should().Be(202m);
        dto.SnapshotTotals.TotalSavingsMonthly.Should().Be(303m);
        dto.SnapshotTotals.TotalDebtPaymentsMonthly.Should().Be(404m);
        dto.SnapshotTotals.FinalBalanceMonthly.Should().Be(-808m);
        dto.ExpenseCategories.Should().BeEmpty();
        dto.SubscriptionInsight.Active.Should().BeEmpty();
        dto.SubscriptionInsight.New.Should().BeEmpty();
        dto.SubscriptionInsight.Removed.Should().BeEmpty();
        dto.SubscriptionInsight.Paused.Should().BeEmpty();
        dto.SubscriptionInsight.Cancelled.Should().BeEmpty();
        dto.SubscriptionInsight.HasPreviousComparableMonth.Should().BeFalse();
    }

    [Fact]
    public async Task ClosedMonth_ReturnsNearestPreviousClosedNonSkippedMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-01", seed.UserId);
        await InsertClosedMonthWithSnapshotAsync(
            budgetId: seed.BudgetId,
            yearMonth: "2026-02",
            createdByUserId: seed.UserId,
            openedAtUtc: new DateTime(2026, 02, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 02, 28, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null,
            totalIncome: 1000m,
            totalExpenses: 200m,
            totalSavings: 300m,
            totalDebtPayments: 400m,
            finalBalance: 100m);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-03",
            status: BudgetMonthStatuses.Skipped,
            openedAtUtc: new DateTime(2026, 03, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 03, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        await InsertClosedMonthWithSnapshotAsync(
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            createdByUserId: seed.UserId,
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null,
            totalIncome: 1100m,
            totalExpenses: 250m,
            totalSavings: 250m,
            totalDebtPayments: 400m,
            finalBalance: 50m);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-02", seed.UserId, ExpenseCategories.Food, "Groceries", 100m);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-02", seed.UserId, ExpenseCategories.Transport, "Transit", 200m);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-02", seed.UserId, ExpenseCategories.Other, "Old one-off", 90m);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-04", seed.UserId, ExpenseCategories.Food, "Groceries", 350m);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-04", seed.UserId, ExpenseCategories.Transport, "Transit", 50m);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-04", seed.UserId, ExpenseCategories.Housing, "Rent", 700m);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Comparison.PreviousComparableYearMonth.Should().Be("2026-02");
        result.Value.Comparison.HasPreviousComparableMonth.Should().BeTrue();
        result.Value.Comparison.Summary.Should().NotBeNull();
        result.Value.Comparison.Summary!.Income.PreviousValue.Should().Be(1000m);
        result.Value.Comparison.Summary.Income.DeltaAmount.Should().Be(100m);
        result.Value.Comparison.Summary.Income.DeltaPercent.Should().Be(10m);
        result.Value.Comparison.Summary.Expenses.DeltaAmount.Should().Be(50m);
        result.Value.Comparison.Summary.Expenses.DeltaPercent.Should().Be(25m);
        result.Value.Comparison.Summary.Savings.DeltaAmount.Should().Be(-50m);
        result.Value.Comparison.Summary.Savings.DeltaPercent.Should().BeApproximately(-16.666666666666666666666666667m, 0.0001m);
        result.Value.Comparison.Summary.DebtPayments.DeltaAmount.Should().Be(0m);
        result.Value.Comparison.Summary.DebtPayments.DeltaPercent.Should().Be(0m);
        result.Value.Comparison.Summary.FinalBalance.DeltaAmount.Should().Be(-50m);
        result.Value.Comparison.Summary.FinalBalance.DeltaPercent.Should().Be(-50m);

        result.Value.ExpenseCategories.Select(x => x.CategoryName)
            .Should().Equal("Housing", "Food", "Transport", "Other");

        var housing = result.Value.ExpenseCategories[0];
        housing.CurrentAmount.Should().Be(700m);
        housing.PreviousAmount.Should().Be(0m);
        housing.DeltaAmount.Should().Be(700m);
        housing.DeltaPercent.Should().BeNull();

        var food = result.Value.ExpenseCategories[1];
        food.CurrentAmount.Should().Be(350m);
        food.PreviousAmount.Should().Be(100m);
        food.DeltaAmount.Should().Be(250m);
        food.DeltaPercent.Should().Be(250m);

        var other = result.Value.ExpenseCategories[3];
        other.CurrentAmount.Should().Be(0m);
        other.PreviousAmount.Should().Be(90m);
        other.DeltaAmount.Should().Be(-90m);
        other.DeltaPercent.Should().Be(-100m);
    }

    [Fact]
    public async Task ClosedMonth_ReturnsNullPreviousComparableMonth_WhenNoneExists()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-04", seed.UserId, ExpenseCategories.Food, "Groceries", 250m);
        await InsertMonthExpenseItemAsync(seed.BudgetId, "2026-04", seed.UserId, ExpenseCategories.Housing, "Rent", 900m);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Comparison.PreviousComparableYearMonth.Should().BeNull();
        result.Value.Comparison.HasPreviousComparableMonth.Should().BeFalse();
        result.Value.Comparison.Summary.Should().BeNull();
        result.Value.ExpenseCategories.Select(x => x.CategoryName).Should().Equal("Housing", "Food");
        result.Value.ExpenseCategories.Should().OnlyContain(x =>
            x.PreviousAmount == null &&
            x.DeltaAmount == null &&
            x.DeltaPercent == null);
    }

    [Fact]
    public async Task ClosedMonth_ReturnsActiveSubscriptionsForCurrentClosedMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Spotify",
            109m);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.Active.Should().ContainSingle(x =>
            x.Name == "Spotify" &&
            x.AmountMonthly == 109m &&
            x.IdentityKey == "name:SPOTIFY" &&
            x.SourceExpenseItemId == null);
    }

    [Fact]
    public async Task ClosedMonth_DerivesNewSubscriptions_WhenCurrentSubscriptionMissingInPreviousComparableMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-03", seed.UserId);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Notion",
            80m);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.HasPreviousComparableMonth.Should().BeTrue();
        result.Value.SubscriptionInsight.New.Should().ContainSingle(x => x.Name == "Notion");
        result.Value.SubscriptionInsight.Active.Should().BeEmpty();
        result.Value.SubscriptionInsight.Removed.Should().BeEmpty();
    }

    [Fact]
    public async Task ClosedMonth_DerivesRemovedSubscriptions_WhenPreviousSubscriptionMissingInCurrentMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-03", seed.UserId);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-03",
            seed.UserId,
            ExpenseCategories.Subscription,
            "HBO",
            119m);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.Removed.Should().ContainSingle(x => x.Name == "HBO");
        result.Value.SubscriptionInsight.Active.Should().BeEmpty();
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
    }

    [Fact]
    public async Task ClosedMonth_DerivesStillActiveSubscriptions_WhenIdentityExistsInBothMonths()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sourceExpenseItemId = Guid.NewGuid();

        await InsertCoreExpenseItemAsync(
            seed.BudgetId,
            seed.UserId,
            ExpenseCategories.Subscription,
            "Netflix",
            129m,
            sourceExpenseItemId);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-03", seed.UserId);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-03",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Netflix",
            129m,
            sourceExpenseItemId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Netflix Premium",
            149m,
            sourceExpenseItemId);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.Active.Should().ContainSingle(x =>
            x.Name == "Netflix Premium" &&
            x.AmountMonthly == 149m &&
            x.IdentityKey == $"source:{sourceExpenseItemId:D}" &&
            x.SourceExpenseItemId == sourceExpenseItemId.ToString());
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
        result.Value.SubscriptionInsight.Removed.Should().BeEmpty();
    }

    [Fact]
    public async Task ClosedMonth_SubscriptionComparison_SkipsSkippedMonths()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-02", seed.UserId);
        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-03",
            status: BudgetMonthStatuses.Skipped,
            openedAtUtc: new DateTime(2026, 03, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 03, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-02",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Audible",
            99m);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Audible",
            99m);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Comparison.PreviousComparableYearMonth.Should().Be("2026-02");
        result.Value.SubscriptionInsight.Active.Should().ContainSingle(x => x.Name == "Audible");
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
    }

    [Fact]
    public async Task ClosedMonth_NoPreviousComparableMonth_DoesNotClassifyCurrentSubscriptionsAsNew()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Dropbox",
            120m);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.HasPreviousComparableMonth.Should().BeFalse();
        result.Value.SubscriptionInsight.Active.Should().ContainSingle(x => x.Name == "Dropbox");
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
        result.Value.SubscriptionInsight.Removed.Should().BeEmpty();
    }

    [Fact]
    public async Task ClosedMonth_SubscriptionsUseMonthlyRows_NotCurrentCoreExpenseRows()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertCoreExpenseItemAsync(
            seed.BudgetId,
            seed.UserId,
            ExpenseCategories.Subscription,
            "Current plan only",
            499m);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.Active.Should().BeEmpty();
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
        result.Value.SubscriptionInsight.Removed.Should().BeEmpty();
    }

    [Fact]
    public async Task ClosedMonth_SubscriptionsIncludeCurrentNonDeletedRowsAndExcludeDeletedRows()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Active subscription",
            50m);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Inactive subscription",
            75m,
            isActive: false);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Deleted subscription",
            90m,
            isDeleted: true);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.Active.Select(x => x.Name)
            .Should().Equal("Active subscription", "Inactive subscription");
    }

    [Fact]
    public async Task ClosedMonth_PausedSubscriptions_AreExcludedFromActiveExpenseAggregationAndIncludedInPausedInsight()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Paused Netflix",
            129m,
            subscriptionLifecycleStatus: BudgetMonthSubscriptionLifecycleStatuses.Paused);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ExpenseCategories.Should().BeEmpty();
        result.Value.SubscriptionInsight.Active.Should().BeEmpty();
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
        result.Value.SubscriptionInsight.Paused.Should().ContainSingle(x =>
            x.Name == "Paused Netflix" &&
            x.AmountMonthly == 129m);
    }

    [Fact]
    public async Task ClosedMonth_CancelledSubscriptions_AreExcludedFromActiveExpenseAggregationAndIncludedInCancelledInsight()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "Cancelled HBO",
            99m,
            subscriptionLifecycleStatus: BudgetMonthSubscriptionLifecycleStatuses.Cancelled);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ExpenseCategories.Should().BeEmpty();
        result.Value.SubscriptionInsight.Active.Should().BeEmpty();
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
        result.Value.SubscriptionInsight.Removed.Should().BeEmpty();
        result.Value.SubscriptionInsight.Cancelled.Should().ContainSingle(x =>
            x.Name == "Cancelled HBO" &&
            x.AmountMonthly == 99m);
    }

    [Fact]
    public async Task ClosedMonth_CancelledCurrentSubscription_IsNotClassifiedAsRemoved()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sourceExpenseItemId = Guid.NewGuid();

        await InsertCoreExpenseItemAsync(
            seed.BudgetId,
            seed.UserId,
            ExpenseCategories.Subscription,
            "HBO",
            99m,
            sourceExpenseItemId);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-03", seed.UserId);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-03",
            seed.UserId,
            ExpenseCategories.Subscription,
            "HBO",
            99m,
            sourceExpenseItemId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Subscription,
            "HBO",
            99m,
            sourceExpenseItemId,
            subscriptionLifecycleStatus: BudgetMonthSubscriptionLifecycleStatuses.Cancelled);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SubscriptionInsight.Cancelled.Should().ContainSingle(x => x.Name == "HBO");
        result.Value.SubscriptionInsight.Removed.Should().BeEmpty();
        result.Value.SubscriptionInsight.Active.Should().BeEmpty();
        result.Value.SubscriptionInsight.New.Should().BeEmpty();
    }

    [Fact]
    public async Task ClosedMonth_NonSubscriptionRows_AreNotAffectedBySubscriptionLifecycleFilter()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);
        await InsertMonthExpenseItemAsync(
            seed.BudgetId,
            "2026-04",
            seed.UserId,
            ExpenseCategories.Food,
            "Groceries",
            250m);

        var result = await CreateHandler().Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ExpenseCategories.Should().ContainSingle(x =>
            x.CategoryName == "Food" &&
            x.CurrentAmount == 250m);
    }

    [Fact]
    public async Task ClosedMonth_ComparisonPercentIsNull_WhenPreviousValueIsZero()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(
            budgetId: seed.BudgetId,
            yearMonth: "2026-03",
            createdByUserId: seed.UserId,
            openedAtUtc: new DateTime(2026, 03, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 03, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null,
            totalIncome: 0m,
            totalExpenses: 0m,
            totalSavings: 0m,
            totalDebtPayments: 0m,
            finalBalance: 0m);
        await InsertClosedMonthWithSnapshotAsync(
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            createdByUserId: seed.UserId,
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null,
            totalIncome: 100m,
            totalExpenses: 50m,
            totalSavings: 25m,
            totalDebtPayments: 10m,
            finalBalance: 15m);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Comparison.Summary.Should().NotBeNull();
        result.Value.Comparison.Summary!.Income.DeltaAmount.Should().Be(100m);
        result.Value.Comparison.Summary.Income.DeltaPercent.Should().BeNull();
        result.Value.Comparison.Summary.Expenses.DeltaPercent.Should().BeNull();
        result.Value.Comparison.Summary.Savings.DeltaPercent.Should().BeNull();
        result.Value.Comparison.Summary.DebtPayments.DeltaPercent.Should().BeNull();
        result.Value.Comparison.Summary.FinalBalance.DeltaPercent.Should().BeNull();
    }

    [Fact]
    public async Task OpenMonth_ReturnsClearDomainFailure()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            ym: "2026-04",
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(BudgetMonth.RecapRequiresClosedMonth.Code);
    }

    [Fact]
    public async Task SkippedMonth_ReturnsClearDomainFailure()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            status: BudgetMonthStatuses.Skipped,
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(BudgetMonth.RecapRequiresClosedMonth.Code);
    }

    private GetBudgetMonthRecapQueryHandler CreateHandler()
    {
        var opts = Options.Create(new DatabaseSettings
        {
            ConnectionString = _db.ConnectionString,
            DefaultCommandTimeoutSeconds = 30
        });

        var uow = new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, opts);

        return new GetBudgetMonthRecapQueryHandler(repo);
    }

    private Task InsertClosedMonthWithSnapshotAsync(
        Guid budgetId,
        string yearMonth,
        Guid createdByUserId)
        => InsertClosedMonthWithSnapshotAsync(
            budgetId,
            yearMonth,
            createdByUserId,
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 01, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null,
            totalIncome: 1000m,
            totalExpenses: 200m,
            totalSavings: 300m,
            totalDebtPayments: 400m,
            finalBalance: 100m);

    private async Task InsertClosedMonthWithSnapshotAsync(
        Guid budgetId,
        string yearMonth,
        Guid createdByUserId,
        DateTime openedAtUtc,
        DateTime closedAtUtc,
        string carryOverMode,
        decimal? carryOverAmount,
        decimal totalIncome,
        decimal totalExpenses,
        decimal totalSavings,
        decimal totalDebtPayments,
        decimal finalBalance)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth
            (
                Id,
                BudgetId,
                YearMonth,
                Status,
                OpenedAt,
                ClosedAt,
                CarryOverMode,
                CarryOverAmount,
                SnapshotTotalIncomeMonthly,
                SnapshotTotalExpensesMonthly,
                SnapshotTotalSavingsMonthly,
                SnapshotTotalDebtPaymentsMonthly,
                SnapshotFinalBalanceMonthly,
                CreatedAt,
                CreatedByUserId
            )
            VALUES
            (
                UUID_TO_BIN(UUID()),
                @BudgetId,
                @YearMonth,
                'closed',
                @OpenedAtUtc,
                @ClosedAtUtc,
                @CarryOverMode,
                @CarryOverAmount,
                @TotalIncome,
                @TotalExpenses,
                @TotalSavings,
                @TotalDebtPayments,
                @FinalBalance,
                UTC_TIMESTAMP(),
                @CreatedByUserId
            );
        """, new
        {
            BudgetId = budgetId,
            YearMonth = yearMonth,
            OpenedAtUtc = openedAtUtc,
            ClosedAtUtc = closedAtUtc,
            CarryOverMode = carryOverMode,
            CarryOverAmount = carryOverAmount,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            TotalSavings = totalSavings,
            TotalDebtPayments = totalDebtPayments,
            FinalBalance = finalBalance,
            CreatedByUserId = createdByUserId
        });
    }

    private async Task InsertMonthExpenseItemAsync(
        Guid budgetId,
        string yearMonth,
        Guid createdByUserId,
        Guid categoryId,
        string name,
        decimal amountMonthly,
        Guid? sourceExpenseItemId = null,
        string? subscriptionLifecycleStatus = null,
        bool isActive = true,
        bool isDeleted = false)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await DbSeeds.EnsureDefaultExpenseCategoriesAsync(conn);

        var budgetMonthId = await conn.QuerySingleAsync<Guid>(
            """
            SELECT Id
            FROM BudgetMonth
            WHERE BudgetId = @BudgetId
              AND YearMonth = @YearMonth
            LIMIT 1;
            """,
            new { BudgetId = budgetId, YearMonth = yearMonth });

        await conn.ExecuteAsync(
            """
            INSERT INTO BudgetMonthExpenseItem
            (
                Id,
                BudgetMonthId,
                SourceExpenseItemId,
                CategoryId,
                Name,
                AmountMonthly,
                SubscriptionLifecycleStatus,
                IsActive,
                IsOverride,
                IsDeleted,
                SortOrder,
                CreatedAt,
                CreatedByUserId
            )
            VALUES
            (
                UUID_TO_BIN(UUID()),
                @BudgetMonthId,
                @SourceExpenseItemId,
                @CategoryId,
                @Name,
                @AmountMonthly,
                @SubscriptionLifecycleStatus,
                @IsActive,
                0,
                @IsDeleted,
                0,
                UTC_TIMESTAMP(),
                @CreatedByUserId
            );
            """,
            new
            {
                BudgetMonthId = budgetMonthId,
                SourceExpenseItemId = sourceExpenseItemId,
                CategoryId = categoryId,
                Name = name,
                AmountMonthly = amountMonthly,
                SubscriptionLifecycleStatus = subscriptionLifecycleStatus,
                IsActive = isActive,
                IsDeleted = isDeleted,
                CreatedByUserId = createdByUserId
            });
    }

    private async Task InsertCoreExpenseItemAsync(
        Guid budgetId,
        Guid userId,
        Guid categoryId,
        string name,
        decimal amountMonthly,
        Guid? id = null)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await DbSeeds.EnsureDefaultExpenseCategoriesAsync(conn);

        await conn.ExecuteAsync(
            """
            INSERT INTO ExpenseItem
                (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedAt, CreatedByUserId)
            VALUES
                (@Id, @BudgetId, @CategoryId, @Name, @AmountMonthly, UTC_TIMESTAMP(), @UserId);
            """,
            new
            {
                Id = id ?? Guid.NewGuid(),
                BudgetId = budgetId,
                CategoryId = categoryId,
                Name = name,
                AmountMonthly = amountMonthly,
                UserId = userId
            });
    }
}
