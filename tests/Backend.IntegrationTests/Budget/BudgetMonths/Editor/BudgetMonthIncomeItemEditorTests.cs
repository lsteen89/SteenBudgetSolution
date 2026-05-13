using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.DeleteIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.GetIncomeItems;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Income;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor;

[Collection("it:db")]
public sealed class BudgetMonthIncomeItemEditorTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthIncomeItemEditorTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs)
        => Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    [Fact]
    public async Task GetIncomeItems_ReturnsSalarySideHustleAndHouseholdRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var rows = await GetRowsAsync(sut, seed.Persoid);

        rows.Should().Contain(x => x.Kind == BudgetMonthIncomeItemKinds.Salary);
        rows.Should().Contain(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        rows.Should().Contain(x => x.Kind == BudgetMonthIncomeItemKinds.HouseholdMember);
        rows.Should().OnlyContain(x => x.Id != Guid.Empty);
    }

    [Fact]
    public async Task CreateIncomeItem_WritesMonthOnlyRowAndAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Weekend job",
                    900m,
                    true),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value!.IsMonthOnly.Should().BeTrue();
        create.Value.CanUpdateDefault.Should().BeFalse();

        var monthRow = await GetMonthIncomeRowAsync(create.Value.Id, create.Value.Kind);
        monthRow.Should().NotBeNull();
        monthRow!.Name.Should().Be("Weekend job");
        monthRow.AmountMonthly.Should().Be(900m);

        (await CountChangeEventsAsync(budgetMonthId, "created")).Should().Be(1);
    }

    [Fact]
    public async Task PatchIncomeItem_CurrentMonthOnly_UpdatesMonthRowOnly_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        var baselineBefore = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId!.Value, target.Kind);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    "Month side job",
                    2100m,
                    true,
                    UpdateDefault: false,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        var monthAfter = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        monthAfter!.Name.Should().Be("Month side job");
        monthAfter.AmountMonthly.Should().Be(2100m);

        var baselineAfter = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId.Value, target.Kind);
        baselineAfter.Should().BeEquivalentTo(baselineBefore);
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task PatchIncomeItem_CurrentMonthAndBudgetPlan_UpdatesMonthAndPlan_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.HouseholdMember);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    "Partner updated",
                    700m,
                    true,
                    UpdateDefault: false,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        monthAfter!.Name.Should().Be("Partner updated");
        monthAfter.AmountMonthly.Should().Be(700m);

        var baselineAfter = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId!.Value, target.Kind);
        baselineAfter!.Name.Should().Be("Partner updated");
        baselineAfter.AmountMonthly.Should().Be(700m);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task PatchIncomeItem_BudgetPlanOnly_UpdatesPlanOnly_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        var monthBefore = await GetMonthIncomeRowAsync(target.Id, target.Kind);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    "Plan only side job",
                    2400m,
                    true,
                    UpdateDefault: false,
                    Scope: BudgetMonthIncomeEditScopes.BudgetPlanOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        monthAfter.Should().BeEquivalentTo(monthBefore);

        var baselineAfter = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId!.Value, target.Kind);
        baselineAfter!.Name.Should().Be("Plan only side job");
        baselineAfter.AmountMonthly.Should().Be(2400m);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task BulkPatch_IsAllOrNothing_WhenAnyRowFails()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        var before = await GetMonthIncomeRowAsync(target.Id, target.Kind);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthIncomeItemsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                            target.Id,
                            "Should not persist",
                            3333m,
                            true,
                            false,
                            BudgetMonthIncomeEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                            Guid.NewGuid(),
                            "Missing",
                            1m,
                            true,
                            false,
                            BudgetMonthIncomeEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeTrue();
        var after = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        after.Should().BeEquivalentTo(before);
    }

    [Fact]
    public async Task BulkPatch_WritesOneAuditEventPerChangedRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var targets = (await GetRowsAsync(sut, seed.Persoid))
            .Where(x => x.Kind is BudgetMonthIncomeItemKinds.SideHustle or BudgetMonthIncomeItemKinds.HouseholdMember)
            .ToArray();
        targets.Should().HaveCount(2);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthIncomeItemsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    targets.Select((x, index) => new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                        x.Id,
                        x.Name + " bulk",
                        x.AmountMonthly + 10m + index,
                        x.IsActive,
                        false,
                        BudgetMonthIncomeEditScopes.CurrentMonthOnly)).ToList()),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(2);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Mutations_AreRejected_WhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        await MarkMonthStatusAsync("2026-01", status);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    target.Name,
                    target.AmountMonthly + 1m,
                    target.IsActive,
                    false),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task MonthOnlyRows_RejectBudgetPlanScopes()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Month only",
                    100m,
                    true),
                CancellationToken.None));

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    create.Value!.Id,
                    "Plan fail",
                    200m,
                    true,
                    false,
                    BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonthIncomeItemErrors.CannotUpdatePlanForMonthOnlyRow.Code);
    }

    [Fact]
    public async Task DeleteIncomeItem_SoftDeletesChildRowAndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);

        var deleted = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DeleteHandler.Handle(
                new DeleteBudgetMonthIncomeItemCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        deleted.IsFailure.Should().BeFalse();
        var after = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        after!.IsDeleted.Should().BeTrue();
        (await CountChangeEventsAsync(budgetMonthId, "deleted")).Should().Be(1);
    }

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>> GetRowsAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthIncomeItemsQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<IncomeItemDbRow?> GetMonthIncomeRowAsync(Guid id, string kind)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var sql = kind switch
        {
            BudgetMonthIncomeItemKinds.Salary => """
                SELECT Id, NULL AS Name, NetSalaryMonthly AS AmountMonthly, TRUE AS IsActive, IsDeleted
                FROM BudgetMonthIncome
                WHERE Id = @id
                LIMIT 1;
            """,
            BudgetMonthIncomeItemKinds.HouseholdMember => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, IsDeleted
                FROM BudgetMonthIncomeHouseholdMember
                WHERE Id = @id
                LIMIT 1;
            """,
            _ => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, IsDeleted
                FROM BudgetMonthIncomeSideHustle
                WHERE Id = @id
                LIMIT 1;
            """
        };

        return await conn.QuerySingleOrDefaultAsync<IncomeItemDbRow>(sql, new { id });
    }

    private async Task<IncomeItemDbRow?> GetBaselineIncomeRowAsync(Guid id, string kind)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var sql = kind switch
        {
            BudgetMonthIncomeItemKinds.Salary => """
                SELECT Id, NULL AS Name, NetSalaryMonthly AS AmountMonthly, TRUE AS IsActive, FALSE AS IsDeleted
                FROM Income
                WHERE Id = @id
                LIMIT 1;
            """,
            BudgetMonthIncomeItemKinds.HouseholdMember => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, FALSE AS IsDeleted
                FROM IncomeHouseholdMember
                WHERE Id = @id
                LIMIT 1;
            """,
            _ => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, FALSE AS IsDeleted
                FROM IncomeSideHustle
                WHERE Id = @id
                LIMIT 1;
            """
        };

        return await conn.QuerySingleOrDefaultAsync<IncomeItemDbRow>(sql, new { id });
    }

    private async Task MarkMonthStatusAsync(string yearMonth, string status)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            UPDATE BudgetMonth
            SET Status = @status,
                ClosedAt = CASE WHEN @status = 'closed' THEN UTC_TIMESTAMP() ELSE ClosedAt END
            WHERE YearMonth = @yearMonth;
        """, new { yearMonth, status });
    }

    private async Task<int> CountChangeEventsAsync(Guid budgetMonthId, string changeType)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*)
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'income-item'
              AND ChangeType = @changeType;
        """, new { budgetMonthId, changeType });
    }

    private sealed class IncomeItemDbRow
    {
        public Guid Id { get; init; }
        public string? Name { get; init; }
        public decimal AmountMonthly { get; init; }
        public bool IsActive { get; init; }
        public bool IsDeleted { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthIncomeItemsQueryHandler GetHandler { get; init; }
        public required CreateBudgetMonthIncomeItemCommandHandler CreateHandler { get; init; }
        public required PatchBudgetMonthIncomeItemCommandHandler PatchHandler { get; init; }
        public required PatchBudgetMonthIncomeItemsBulkCommandHandler BulkPatchHandler { get; init; }
        public required DeleteBudgetMonthIncomeItemCommandHandler DeleteHandler { get; init; }
    }

    private Sut CreateSut(DateTime utcNow)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(utcNow);

        var monthsRepo = new BudgetMonthRepository(
            uow,
            NullLogger<BudgetMonthRepository>.Instance,
            dbOpts);

        var seedSourceRepo = new BudgetMonthSeedSourceRepository(
            uow,
            NullLogger<BudgetMonthSeedSourceRepository>.Instance,
            dbOpts);

        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow,
            NullLogger<BudgetMonthMaterializationRepository>.Instance,
            dbOpts);

        var materializer = new BudgetMonthMaterializer(
            seedSourceRepo,
            materializationRepo,
            time);

        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var incomeRepo = new BudgetMonthIncomeItemMutationRepository(
            uow,
            NullLogger<BudgetMonthIncomeItemMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthIncomeItemsQueryHandler(lifecycle, incomeRepo),
            CreateHandler = new CreateBudgetMonthIncomeItemCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System),
            PatchHandler = new PatchBudgetMonthIncomeItemCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System),
            BulkPatchHandler = new PatchBudgetMonthIncomeItemsBulkCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System),
            DeleteHandler = new DeleteBudgetMonthIncomeItemCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System)
        };
    }
}
