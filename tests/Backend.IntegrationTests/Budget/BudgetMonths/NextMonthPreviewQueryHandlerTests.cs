using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.NextPreview;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.Services.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.Infrastructure.Repositories.User;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace Backend.IntegrationTests.Budget.BudgetMonths;

/// <summary>
/// PR 1 — read-only next-month preview. These tests pin the two things that
/// matter most: the endpoint never mutates (no BudgetMonth / month rows are
/// created) and its money reconciles through the same projector the live
/// dashboard uses.
/// </summary>
[Collection("it:db")]
public sealed class NextMonthPreviewQueryHandlerTests
{
    private readonly MariaDbFixture _db;
    public NextMonthPreviewQueryHandlerTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs, DefaultCommandTimeoutSeconds = 30 });

    [Fact]
    public async Task Preview_FromOpenMonth_DerivesNextYearMonth_AndDoesNotMutate()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await MaterializeOpenMonthAsync(seed.Persoid, "2026-01", clock);

        var monthsBefore = await CountAllMonthsAsync(seed.BudgetId);

        var preview = await SendPreviewAsync(seed.Persoid, "2026-01", clock);

        preview.IsSuccess.Should().BeTrue();
        var dto = preview.Value!;
        dto.FromYearMonth.Should().Be("2026-01");
        dto.PreviewYearMonth.Should().Be("2026-02");
        dto.State.Should().Be("preview");
        dto.Basis.Should().Be("budgetPlan");
        dto.Dashboard.Should().NotBeNull();

        // No BudgetMonth row was created for the previewed month, and the
        // overall month count is unchanged.
        (await CountMonthsForYearMonthAsync(seed.BudgetId, "2026-02")).Should().Be(0);
        (await CountAllMonthsAsync(seed.BudgetId)).Should().Be(monthsBefore);

        // And no month-scoped rows were materialised for the previewed month.
        (await CountMaterializedRowsForYearMonthAsync(seed.BudgetId, "2026-02")).Should().Be(0);
    }

    [Fact]
    public async Task Preview_ProjectsPlanRows_ThroughDashboardProjector()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await MaterializeOpenMonthAsync(seed.Persoid, "2026-01", clock);

        var preview = await SendPreviewAsync(seed.Persoid, "2026-01", clock);

        preview.IsSuccess.Should().BeTrue();
        var dash = preview.Value!.Dashboard!;

        // WithData plan: salary 30000 + side 2000 + household 500.
        dash.Income.NetSalaryMonthly.Should().Be(30000m);
        dash.Income.SideHustleMonthly.Should().Be(2000m);
        dash.Income.HouseholdMembersMonthly.Should().Be(500m);

        // Expenses: Rent 9000 + Groceries 2500 + Takeout 500.
        dash.Expenditure.TotalExpensesMonthly.Should().Be(12000m);

        // Savings: 2500 base + 1500 active goal (the completed goal contributes 0).
        dash.Savings.Should().NotBeNull();
        dash.Savings!.TotalSavingsMonthly.Should().Be(4000m);

        // The equation reconciles exactly to the projector's final balance.
        var income = dash.Income.NetSalaryMonthly + dash.Income.SideHustleMonthly + dash.Income.HouseholdMembersMonthly;
        dash.FinalBalanceWithCarryMonthly.Should().Be(
            income
            - dash.Expenditure.TotalExpensesMonthly
            - dash.Savings.TotalSavingsMonthly
            - dash.Debt.TotalMonthlyPayments
            + dash.CarryOverAmountMonthly);
    }

    [Fact]
    public async Task Preview_EstimatedCarryOver_EqualsCurrentMonthLiveFinalBalance()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await MaterializeOpenMonthAsync(seed.Persoid, "2026-01", clock);

        // The current open month's live dashboard is the source of the estimate.
        var live = await SendDashboardAsync(seed.Persoid, "2026-01", clock);
        var currentFinal = live.Value!.LiveDashboard!.FinalBalanceWithCarryMonthly;
        currentFinal.Should().BeGreaterThan(0m);

        var preview = await SendPreviewAsync(seed.Persoid, "2026-01", clock);

        var carry = preview.Value!.CarryOver;
        carry.Mode.Should().Be("estimatedFull");
        carry.Source.Should().Be("currentMonthLiveFinalBalance");
        carry.IsFinal.Should().BeFalse();
        carry.Amount.Should().Be(currentFinal);
        preview.Value!.Dashboard!.CarryOverAmountMonthly.Should().Be(currentFinal);
    }

    [Fact]
    public async Task Preview_FloorsEstimatedCarryOver_AtZero_WhenCurrentMonthIsNegative()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var budgetMonthId = await MaterializeOpenMonthAsync(seed.Persoid, "2026-01", clock);

        // Push the current month's live balance negative with a large month-only
        // expense, so the full-carry estimate would be negative before flooring.
        await InsertMonthExpenseAsync(budgetMonthId, seed.UserId, name: "One-off", amount: 100000m);

        var live = await SendDashboardAsync(seed.Persoid, "2026-01", clock);
        live.Value!.LiveDashboard!.FinalBalanceWithCarryMonthly.Should().BeLessThan(0m);

        var preview = await SendPreviewAsync(seed.Persoid, "2026-01", clock);

        var carry = preview.Value!.CarryOver;
        carry.Mode.Should().Be("estimatedFull");
        carry.Amount.Should().Be(0m); // floored, never negative
        preview.Value!.Dashboard!.CarryOverAmountMonthly.Should().Be(0m);
    }

    [Fact]
    public async Task Preview_EmptyBudgetPlan_ReturnsZeroTotals_NotFakeNumbers()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await MaterializeOpenMonthAsync(seed.Persoid, "2026-01", clock);

        var preview = await SendPreviewAsync(seed.Persoid, "2026-01", clock);

        preview.IsSuccess.Should().BeTrue();
        var dto = preview.Value!;
        dto.State.Should().Be("preview");
        dto.Dashboard.Should().NotBeNull();
        dto.Dashboard!.Income.NetSalaryMonthly.Should().Be(0m);
        dto.Dashboard.Expenditure.TotalExpensesMonthly.Should().Be(0m);
        dto.Dashboard.Debt.TotalMonthlyPayments.Should().Be(0m);
    }

    [Fact]
    public async Task Preview_WhenFromMonthIsClosed_ReturnsUnavailable()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-01",
            status: BudgetMonthStatuses.Closed,
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 01, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var preview = await SendPreviewAsync(seed.Persoid, "2026-01", clock);

        preview.IsSuccess.Should().BeTrue();
        preview.Value!.State.Should().Be("unavailable");
        preview.Value!.Dashboard.Should().BeNull();
        preview.Value!.PreviewYearMonth.Should().Be("2026-02");
    }

    [Fact]
    public async Task Preview_WhenFromMonthMissing_ReturnsUnavailable()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var preview = await SendPreviewAsync(seed.Persoid, "2026-05", clock);

        preview.IsSuccess.Should().BeTrue();
        preview.Value!.State.Should().Be("unavailable");
        preview.Value!.Dashboard.Should().BeNull();
        (await CountAllMonthsAsync(seed.BudgetId)).Should().Be(0);
    }

    [Fact]
    public async Task Preview_InvalidYearMonth_FailsValidation()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var preview = await SendPreviewAsync(seed.Persoid, "2026-1", clock);

        preview.IsFailure.Should().BeTrue();
        preview.Error.Code.Should().Be(BudgetMonth.InvalidYearMonth.Code);
    }

    [Fact]
    public async Task Preview_IsScopedToCurrentUser_OtherBudgetsAreUnavailable()
    {
        await _db.ResetAsync();
        var mine = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var other = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        // Only the OTHER user has an open month for 2026-01.
        await MaterializeOpenMonthAsync(other.Persoid, "2026-01", clock);

        var preview = await SendPreviewAsync(mine.Persoid, "2026-01", clock);

        // My request must not see the other user's open month.
        preview.IsSuccess.Should().BeTrue();
        preview.Value!.State.Should().Be("unavailable");
        preview.Value!.Dashboard.Should().BeNull();
    }

    // ---- orchestration helpers ------------------------------------------------

    private async Task<Backend.Domain.Shared.Result<Backend.Application.DTO.Budget.Months.NextMonthPreviewDto>>
        SendPreviewAsync(Guid persoid, string fromYearMonth, ITimeProvider clock)
    {
        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        return await mediator.Send(new GetNextMonthPreviewQuery(persoid, fromYearMonth), CancellationToken.None);
    }

    private async Task<Backend.Domain.Shared.Result<Backend.Application.DTO.Budget.Dashboard.BudgetDashboardMonthDto?>>
        SendDashboardAsync(Guid persoid, string yearMonth, ITimeProvider clock)
    {
        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        return await mediator.Send(
            new Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth.GetBudgetDashboardMonthQuery(persoid, yearMonth),
            CancellationToken.None);
    }

    /// <summary>
    /// Opens and materialises a month the production way (lifecycle ensure inside
    /// a transaction), so the preview's carry-over estimate has real live data to
    /// read. Returns the materialised BudgetMonthId.
    /// </summary>
    private async Task<Guid> MaterializeOpenMonthAsync(Guid persoid, string yearMonth, ITimeProvider clock)
    {
        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var ensure = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, yearMonth, CancellationToken.None));

        ensure.IsSuccess.Should().BeTrue();
        return ensure.Value!.BudgetMonthId;
    }

    // ---- db helpers -----------------------------------------------------------

    private async Task<int> CountAllMonthsAsync(Guid budgetId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonth WHERE BudgetId = @budgetId;",
            new { budgetId });
    }

    private async Task<int> CountMonthsForYearMonthAsync(Guid budgetId, string yearMonth)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonth WHERE BudgetId = @budgetId AND YearMonth = @yearMonth;",
            new { budgetId, yearMonth });
    }

    private async Task<int> CountMaterializedRowsForYearMonthAsync(Guid budgetId, string yearMonth)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>(
            """
            SELECT
                (SELECT COUNT(*) FROM BudgetMonthIncome bmi
                    INNER JOIN BudgetMonth bm ON bm.Id = bmi.BudgetMonthId
                    WHERE bm.BudgetId = @budgetId AND bm.YearMonth = @yearMonth)
              + (SELECT COUNT(*) FROM BudgetMonthExpenseItem bme
                    INNER JOIN BudgetMonth bm ON bm.Id = bme.BudgetMonthId
                    WHERE bm.BudgetId = @budgetId AND bm.YearMonth = @yearMonth)
              + (SELECT COUNT(*) FROM BudgetMonthSavings bms
                    INNER JOIN BudgetMonth bm ON bm.Id = bms.BudgetMonthId
                    WHERE bm.BudgetId = @budgetId AND bm.YearMonth = @yearMonth)
              + (SELECT COUNT(*) FROM BudgetMonthDebt bmd
                    INNER JOIN BudgetMonth bm ON bm.Id = bmd.BudgetMonthId
                    WHERE bm.BudgetId = @budgetId AND bm.YearMonth = @yearMonth);
            """,
            new { budgetId, yearMonth });
    }

    private async Task InsertMonthExpenseAsync(Guid budgetMonthId, Guid userId, string name, decimal amount)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await DbSeeds.EnsureDefaultExpenseCategoriesAsync(conn);
        await conn.ExecuteAsync(
            """
            INSERT INTO BudgetMonthExpenseItem
            (Id, BudgetMonthId, SourceExpenseItemId, CategoryId, Name, AmountMonthly,
             SubscriptionLifecycleStatus, IsActive, IsOverride, IsDeleted, SortOrder, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @BudgetMonthId, NULL,
             UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21','-','')), @Name, @Amount,
             NULL, 1, 0, 0, 0, UTC_TIMESTAMP(), @UserId);
            """,
            new { BudgetMonthId = budgetMonthId, Name = name, Amount = amount, UserId = userId });
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private static ServiceProvider BuildServiceProvider(string cs, ITimeProvider clock)
    {
        var services = new ServiceCollection();
        var opts = DbOptions(cs);

        services.AddLogging();
        services.AddSingleton<IOptions<DatabaseSettings>>(opts);

        services.AddScoped<IUnitOfWork>(_ => new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance));

        services.AddScoped<IBudgetMonthRepository>(sp =>
            new BudgetMonthRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthRepository>.Instance,
                opts));

        services.AddScoped<IBudgetMonthDashboardRepository>(sp =>
            new BudgetMonthDashboardRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthDashboardRepository>.Instance,
                opts,
                clock));

        services.AddScoped<IUserRepository>(sp =>
            new UserRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<UserRepository>.Instance,
                opts));

        services.AddScoped<IBudgetMonthSeedSourceRepository>(sp =>
            new BudgetMonthSeedSourceRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthSeedSourceRepository>.Instance,
                opts));

        services.AddScoped<IBudgetMonthMaterializationRepository>(sp =>
            new BudgetMonthMaterializationRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthMaterializationRepository>.Instance,
                opts));

        services.AddSingleton<ITimeProvider>(clock);
        services.AddSingleton<IDebtPaymentCalculator>(new DebtPaymentCalculator());

        services.AddScoped<IBudgetMonthMaterializer, BudgetMonthMaterializer>();
        services.AddScoped<IBudgetMonthLifecycleService, BudgetMonthLifecycleService>();
        services.AddScoped<IBudgetDashboardProjector>(_ => new BudgetDashboardProjector());
        services.AddScoped<INextMonthPreviewReadModelBuilder, NextMonthPreviewReadModelBuilder>();

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(GetNextMonthPreviewQueryHandler).Assembly);
            cfg.AddOpenBehavior(typeof(UnitOfWorkPipelineBehavior<,>));
        });

        return services.BuildServiceProvider();
    }
}
