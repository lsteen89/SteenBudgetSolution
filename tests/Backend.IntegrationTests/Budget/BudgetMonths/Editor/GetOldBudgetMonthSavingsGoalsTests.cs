using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CompleteSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetOldSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Savings;
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
using Backend.Application.Abstractions.Infrastructure.System;

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor;

[Collection("it:db")]
public sealed class GetOldBudgetMonthSavingsGoalsTests
{
    private readonly MariaDbFixture _db;

    public GetOldBudgetMonthSavingsGoalsTests(MariaDbFixture db) => _db = db;

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
    public async Task ReturnsEmpty_WhenNoClosedGoals()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var result = await GetOldRowsAsync(sut, seed.Persoid);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ReturnsCompletedAndCancelled_NotRemoved_NotDeleted_NotActive()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var activeRows = await GetActiveRowsAsync(sut, seed.Persoid);
        var emergency = activeRows.First(r => r.Name == "Emergency fund");
        var holiday = activeRows.First(r => r.Name == "Already done");

        // Two seeded goals — close one as completed, the other as cancelled.
        await ForceMonthClosedAsync(
            emergency.Id,
            SavingsGoalClosedReasons.Completed,
            new DateTime(2026, 02, 28, 12, 00, 00, DateTimeKind.Utc),
            isDeleted: false);
        await ForceMonthClosedAsync(
            holiday.Id,
            SavingsGoalClosedReasons.Cancelled,
            new DateTime(2026, 03, 01, 09, 00, 00, DateTimeKind.Utc),
            isDeleted: false);

        // Manually insert a removed row and a deleted row to prove they're
        // excluded server-side.
        var removedId = await InsertExtraClosedGoalAsync(
            seed.Persoid,
            "Removed example",
            SavingsGoalClosedReasons.Removed,
            new DateTime(2026, 03, 02, 09, 00, 00, DateTimeKind.Utc),
            isDeleted: false);
        var deletedId = await InsertExtraClosedGoalAsync(
            seed.Persoid,
            "Deleted example",
            SavingsGoalClosedReasons.Completed,
            new DateTime(2026, 03, 03, 09, 00, 00, DateTimeKind.Utc),
            isDeleted: true);

        var result = await GetOldRowsAsync(sut, seed.Persoid);

        result.Should().HaveCount(2);
        result.Select(r => r.Id).Should().NotContain(removedId);
        result.Select(r => r.Id).Should().NotContain(deletedId);
        result.Select(r => r.Name).Should().BeEquivalentTo(new[] { "Already done", "Emergency fund" });
        result.All(r => r.Status == SavingsGoalStatuses.Closed).Should().BeTrue();
        result.All(r =>
            r.ClosedReason == SavingsGoalClosedReasons.Completed
            || r.ClosedReason == SavingsGoalClosedReasons.Cancelled).Should().BeTrue();

        // Active rows are still active-only and have not picked up the closed ones.
        var stillActive = await GetActiveRowsAsync(sut, seed.Persoid);
        stillActive.Select(r => r.Id).Should().NotContain(emergency.Id);
        stillActive.Select(r => r.Id).Should().NotContain(holiday.Id);
    }

    // Cross-month archive: a goal completed in an earlier month MUST keep
    // appearing under "Tidigare mål" when the user is editing a later open
    // month. Plan-linked closed goals are not re-materialized into new
    // months (the close-month materializer skips closed baselines), so a
    // month-local archive query would silently lose them. This test pins
    // the budget-scoped behavior the read model is expected to provide.
    [Fact]
    public async Task PlanLinkedGoalCompletedInPriorMonth_StillAppearsInLaterOpenMonthArchive()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        // Materialize January, then close a plan-linked goal there at a
        // deterministic UTC instant (using ForceMonthClosedAsync so the
        // ClosedAt timestamp is not "real now", which would slip past
        // February's archive upper-bound filter in this test environment).
        // The complete-handler itself is already covered by the lifecycle
        // suite; this test is about the archive read.
        await EnsureMonthAsync(sut, seed.Persoid, "2026-01");
        var jan = await GetActiveRowsAsync(sut, seed.Persoid, "2026-01");
        var target = jan.First(r => r.Name == "Emergency fund");

        await ForceMonthClosedAsync(
            target.Id,
            SavingsGoalClosedReasons.Completed,
            new DateTime(2026, 01, 20, 12, 00, 00, DateTimeKind.Utc),
            isDeleted: false);

        // Lifecycle blocks accessing a new month while another is open.
        // Force January closed at the row level so February can be
        // materialized; we're only proving the archive read.
        await MarkMonthStatusAsync("2026-01", "closed");

        // Move into February — the materializer should skip the now-closed
        // baseline goal, so no February row exists for "Emergency fund".
        await EnsureMonthAsync(sut, seed.Persoid, "2026-02");
        var feb = await GetActiveRowsAsync(sut, seed.Persoid, "2026-02");
        feb.Should().NotContain(r => r.Name == "Emergency fund");

        var archive = await GetOldRowsAsync(sut, seed.Persoid, "2026-02");

        archive.Should().Contain(r => r.Name == "Emergency fund",
            because: "previous goals must persist across months for the same budget");
        var row = archive.First(r => r.Name == "Emergency fund");
        row.Status.Should().Be(SavingsGoalStatuses.Closed);
        row.ClosedReason.Should().Be(SavingsGoalClosedReasons.Completed);
    }

    // Completed goals must display the "reached at close" amount, not raw
    // stored progression. Per the close-month contract, close-month does NOT
    // advance AmountSaved — the canonical reached amount is
    // `AmountSaved + MonthlyContribution`. The archive contract exposes this
    // explicitly as `AmountSavedAtClose` so the UI never has to compute it.
    [Fact]
    public async Task CompletedGoal_AmountSavedAtClose_IsAmountSavedPlusMonthlyContribution()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetActiveRowsAsync(sut, seed.Persoid);
        var target = rows.First(r => r.Name == "Emergency fund");

        // Pin a known shape: 98 000 saved + 2 500 contribution → 100 500 reached.
        await SetBaselineAmountsAsync(target.SourceSavingsGoalId!.Value, amountSaved: 98_000m, monthlyContribution: 2_500m);
        await ForceMonthClosedAsync(
            target.Id,
            SavingsGoalClosedReasons.Completed,
            new DateTime(2026, 02, 28, 12, 00, 00, DateTimeKind.Utc),
            isDeleted: false);

        var archive = await GetOldRowsAsync(sut, seed.Persoid);
        var row = archive.Single(r => r.Name == "Emergency fund");

        row.AmountSavedAtClose.Should().Be(100_500m,
            because: "completed goals must display AmountSaved + MonthlyContribution, not raw");
    }

    [Fact]
    public async Task CancelledGoal_AmountSavedAtClose_IsRawAmountSaved()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetActiveRowsAsync(sut, seed.Persoid);
        var target = rows.First(r => r.Name == "Emergency fund");

        await SetBaselineAmountsAsync(target.SourceSavingsGoalId!.Value, amountSaved: 21_800m, monthlyContribution: 1_000m);
        await ForceMonthClosedAsync(
            target.Id,
            SavingsGoalClosedReasons.Cancelled,
            new DateTime(2026, 02, 28, 12, 00, 00, DateTimeKind.Utc),
            isDeleted: false);

        var archive = await GetOldRowsAsync(sut, seed.Persoid);
        var row = archive.Single(r => r.Name == "Emergency fund");

        row.AmountSavedAtClose.Should().Be(21_800m,
            because: "cancelled goals display what was actually saved, no projection");
    }

    // Future-leak: viewing the archive from an earlier month must not surface
    // goals closed after that month. Today the FE only opens the savings
    // editor on the current open month so the issue is latent, but the
    // contract should be honest in case month navigation lands later.
    [Fact]
    public async Task ExcludesGoalsClosedAfterSelectedYearMonth()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));

        // Materialize January and March, close goals in each.
        await EnsureMonthAsync(sut, seed.Persoid, "2026-01");
        var jan = await GetActiveRowsAsync(sut, seed.Persoid, "2026-01");
        var emergency = jan.First(r => r.Name == "Emergency fund");
        var alreadyDone = jan.First(r => r.Name == "Already done");

        await ForceMonthClosedAsync(
            emergency.Id,
            SavingsGoalClosedReasons.Completed,
            new DateTime(2026, 01, 25, 09, 00, 00, DateTimeKind.Utc),
            isDeleted: false);

        await ForceMonthClosedAsync(
            alreadyDone.Id,
            SavingsGoalClosedReasons.Cancelled,
            new DateTime(2026, 03, 04, 09, 00, 00, DateTimeKind.Utc),
            isDeleted: false);

        // Viewing January's archive must surface January's closure but not
        // March's, because the user is "as of January".
        var janArchive = await GetOldRowsAsync(sut, seed.Persoid, "2026-01");
        janArchive.Select(r => r.Name).Should().Contain("Emergency fund");
        janArchive.Select(r => r.Name).Should().NotContain("Already done");
    }

    [Fact]
    public async Task SortsByClosedAtDescending()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var activeRows = await GetActiveRowsAsync(sut, seed.Persoid);
        var emergency = activeRows.First(r => r.Name == "Emergency fund");
        var holiday = activeRows.First(r => r.Name == "Already done");

        await ForceMonthClosedAsync(
            emergency.Id,
            SavingsGoalClosedReasons.Completed,
            new DateTime(2026, 01, 15, 12, 00, 00, DateTimeKind.Utc),
            isDeleted: false);
        await ForceMonthClosedAsync(
            holiday.Id,
            SavingsGoalClosedReasons.Cancelled,
            new DateTime(2026, 02, 20, 12, 00, 00, DateTimeKind.Utc),
            isDeleted: false);

        var result = await GetOldRowsAsync(sut, seed.Persoid);

        result.Should().HaveCount(2);
        result[0].Name.Should().Be("Already done");           // most recent closed first
        result[1].Name.Should().Be("Emergency fund");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid) =>
        EnsureMonthAsync(sut, persoid, "2026-03");

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid, string yearMonth)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, yearMonth, CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private Task<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>> GetActiveRowsAsync(Sut sut, Guid persoid) =>
        GetActiveRowsAsync(sut, persoid, "2026-03");

    private async Task<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>> GetActiveRowsAsync(
        Sut sut,
        Guid persoid,
        string yearMonth)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthSavingsGoalsQuery(persoid, yearMonth),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private Task<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>> GetOldRowsAsync(Sut sut, Guid persoid) =>
        GetOldRowsAsync(sut, persoid, "2026-03");

    private async Task<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>> GetOldRowsAsync(
        Sut sut,
        Guid persoid,
        string yearMonth)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetOldHandler.Handle(
                new GetOldBudgetMonthSavingsGoalsQuery(persoid, yearMonth),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    // Closes the BudgetMonthSavingsGoal row AND its linked baseline SavingsGoal
    // row (when present), matching what the real lifecycle handler does. The
    // archive read is budget-scoped via the baseline table, so closing only
    // the month row would not surface plan-linked goals.
    private async Task ForceMonthClosedAsync(
        Guid monthSavingsGoalId,
        string closedReason,
        DateTime closedAtUtc,
        bool isDeleted)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavingsGoal
            SET Status       = 'closed',
                ClosedReason = @closedReason,
                ClosedAt     = @closedAtUtc,
                IsDeleted    = @isDeleted
            WHERE Id = @monthSavingsGoalId;
        """, new { monthSavingsGoalId, closedReason, closedAtUtc, isDeleted = isDeleted ? 1 : 0 });

        await conn.ExecuteAsync("""
            UPDATE SavingsGoal sg
            JOIN BudgetMonthSavingsGoal g ON g.SourceSavingsGoalId = sg.Id
            SET sg.Status       = 'closed',
                sg.ClosedReason = @closedReason,
                sg.ClosedAt     = @closedAtUtc
            WHERE g.Id = @monthSavingsGoalId;
        """, new { monthSavingsGoalId, closedReason, closedAtUtc });
    }

    private async Task SetBaselineAmountsAsync(
        Guid sourceSavingsGoalId,
        decimal amountSaved,
        decimal monthlyContribution)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE SavingsGoal
            SET AmountSaved = @amountSaved,
                MonthlyContribution = @monthlyContribution
            WHERE Id = @sourceSavingsGoalId;
        """, new { sourceSavingsGoalId, amountSaved, monthlyContribution });
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

    // Inserts a fresh BudgetMonthSavingsGoal row in the closed state so we
    // can assert that removed and IsDeleted=1 rows are filtered out of the
    // archive read. Picks the seeded month's BudgetMonthSavings parent so
    // foreign-key constraints stay happy.
    private async Task<Guid> InsertExtraClosedGoalAsync(
        Guid persoid,
        string name,
        string closedReason,
        DateTime closedAtUtc,
        bool isDeleted)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var parentId = await conn.ExecuteScalarAsync<Guid>("""
            SELECT s.Id
            FROM BudgetMonthSavings s
            JOIN BudgetMonth bm ON bm.Id = s.BudgetMonthId
            JOIN Budget b ON b.Id = bm.BudgetId
            WHERE b.Persoid = @persoid
              AND bm.YearMonth = '2026-03'
              AND s.IsDeleted = 0
            LIMIT 1;
        """, new { persoid });

        var id = Guid.NewGuid();
        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonthSavingsGoal
                (Id, BudgetMonthSavingsId, SourceSavingsGoalId, Name,
                 TargetAmount, TargetDate, AmountSaved, MonthlyContribution,
                 OpenedAt, Status, ClosedReason, ClosedAt,
                 IsOverride, IsDeleted, SortOrder,
                 CreatedAt, CreatedByUserId, UpdatedAt, UpdatedByUserId)
            VALUES
                (@id, @parentId, NULL, @name,
                 0, NULL, 0, 0,
                 UTC_TIMESTAMP(), 'closed', @closedReason, @closedAtUtc,
                 0, @isDeleted, 100,
                 UTC_TIMESTAMP(), @persoid, UTC_TIMESTAMP(), @persoid);
        """, new
        {
            id,
            parentId,
            name,
            closedReason,
            closedAtUtc,
            isDeleted = isDeleted ? 1 : 0,
            persoid
        });
        return id;
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

        var savingsRepo = new BudgetMonthSavingsGoalMutationRepository(
            uow,
            NullLogger<BudgetMonthSavingsGoalMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthSavingsGoalsQueryHandler(lifecycle, savingsRepo),
            GetOldHandler = new GetOldBudgetMonthSavingsGoalsQueryHandler(lifecycle, savingsRepo),
            CompleteHandler = new CompleteBudgetMonthSavingsGoalCommandHandler(
                lifecycle, savingsRepo, changeEventRepo, TimeProvider.System),
        };
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthSavingsGoalsQueryHandler GetHandler { get; init; }
        public required GetOldBudgetMonthSavingsGoalsQueryHandler GetOldHandler { get; init; }
        public required CompleteBudgetMonthSavingsGoalCommandHandler CompleteHandler { get; init; }
    }
}
