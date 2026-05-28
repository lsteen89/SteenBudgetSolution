using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.CloseBudgetMonth;
using Backend.Application.Features.Budgets.Months.CloseBudgetMonth.GetSavingsGoalCompletionCandidates;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.Services.Debts;
using Backend.Application.Common.Behaviors;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Audit;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Savings;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
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

// Backend integration coverage for PR4: choosing savings goals to mark as
// completed when closing a month. These tests run the real handler against
// a real MariaDB so the candidate SQL, the transactional applier, and the
// recap query are exercised end-to-end.
[Collection("it:db")]
public sealed class CloseBudgetMonthSavingsCompletionTests
{
    private readonly MariaDbFixture _db;

    public CloseBudgetMonthSavingsCompletionTests(MariaDbFixture db) => _db = db;

    // Used by every test in this file: April with a goal whose projected
    // amount (AmountSaved + MonthlyContribution) hits the target exactly.
    private const string TargetYearMonth = "2026-04";
    private static readonly DateTime CloseNowUtc =
        new(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task GetCompletionCandidates_ReturnsGoals_WhereProjectedReachesTarget()
    {
        await _db.ResetAsync();
        var seed = await SeedClosableMonthWithGoalsAsync(TargetYearMonth);
        var sut = CreateSut(new FakeTimeProvider(CloseNowUtc));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CandidatesHandler.Handle(
                new GetSavingsGoalCompletionCandidatesQuery(seed.Persoid, TargetYearMonth),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();
        var candidates = result.Value!;

        // CompletableNow projects to exactly TargetAmount → candidate.
        // BehindSchedule is well below target → must NOT appear.
        // NoTarget has TargetAmount=NULL → must NOT appear.
        candidates.Should().ContainSingle(c => c.Id == seed.CompletableMonthGoalId);
        candidates.Should().NotContain(c => c.Id == seed.BehindScheduleMonthGoalId);
        candidates.Should().NotContain(c => c.Id == seed.NoTargetMonthGoalId);

        var completable = candidates.Single();
        completable.TargetAmount.Should().Be(10_000m);
        completable.AmountSaved.Should().Be(9_500m);
        completable.MonthlyContribution.Should().Be(500m);
        completable.ProjectedAmountSaved.Should().Be(10_000m);
        completable.RemainingAfterContribution.Should().Be(0m);
    }

    [Fact]
    public async Task Close_WithoutCompletedSavingsGoalIds_LeavesAllGoalsActive()
    {
        await _db.ResetAsync();
        var seed = await SeedClosableMonthWithGoalsAsync(TargetYearMonth);
        var sut = CreateSut(new FakeTimeProvider(CloseNowUtc));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CloseHandler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    TargetYearMonth,
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        var status = await GetMonthGoalStatusAsync(seed.CompletableMonthGoalId);
        status.Should().Be(("active", null));
    }

    [Fact]
    public async Task Close_WithSelectedCandidate_ClosesMonthRowAndBaselineRow()
    {
        await _db.ResetAsync();
        var seed = await SeedClosableMonthWithGoalsAsync(TargetYearMonth);
        var sut = CreateSut(new FakeTimeProvider(CloseNowUtc));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CloseHandler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    TargetYearMonth,
                    new CloseBudgetMonthRequestDto(
                        BudgetMonthCarryOverModes.None,
                        CompletedSavingsGoalIds: new[] { seed.CompletableMonthGoalId })),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        var monthStatus = await GetMonthGoalStatusAsync(seed.CompletableMonthGoalId);
        monthStatus.Should().Be(("closed", "completed"));

        var baselineStatus = await GetBaselineGoalStatusAsync(seed.CompletableBaselineGoalId);
        baselineStatus.Should().Be(("closed", "completed"));

        // AmountSaved must NOT have been mutated by close-month — completion
        // is a lifecycle transition, not a progression event.
        var amountSaved = await GetMonthGoalAmountSavedAsync(seed.CompletableMonthGoalId);
        amountSaved.Should().Be(9_500m);
    }

    [Fact]
    public async Task Close_RejectsNonCandidate_AndDoesNotCloseMonth()
    {
        await _db.ResetAsync();
        var seed = await SeedClosableMonthWithGoalsAsync(TargetYearMonth);
        var sut = CreateSut(new FakeTimeProvider(CloseNowUtc));

        var behavior = new UnitOfWorkPipelineBehavior<
            CloseBudgetMonthCommand,
            Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>(
                sut.Uow,
                NullLogger<UnitOfWorkPipelineBehavior<
                    CloseBudgetMonthCommand,
                    Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>>.Instance);

        // BehindSchedule is not a candidate; the whole close must be
        // rejected and the transaction rolled back.
        var command = new CloseBudgetMonthCommand(
            seed.Persoid,
            seed.UserId,
            TargetYearMonth,
            new CloseBudgetMonthRequestDto(
                BudgetMonthCarryOverModes.None,
                CompletedSavingsGoalIds: new[] { seed.BehindScheduleMonthGoalId }));

        var result = await behavior.Handle(
            command,
            () => sut.CloseHandler.Handle(command, CancellationToken.None),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(
            Backend.Domain.Errors.Budget.BudgetMonth.InvalidSavingsGoalCompletionCandidate.Code);

        var month = await GetMonthRowAsync(seed.BudgetId, TargetYearMonth);
        month!.Status.Should().Be("open");
        var behindStatus = await GetMonthGoalStatusAsync(seed.BehindScheduleMonthGoalId);
        behindStatus.Should().Be(("active", null));
    }

    [Fact]
    public async Task Recap_ExposesCompletedGoals_AfterClose()
    {
        await _db.ResetAsync();
        var seed = await SeedClosableMonthWithGoalsAsync(TargetYearMonth);
        var sut = CreateSut(new FakeTimeProvider(CloseNowUtc));

        var closeResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CloseHandler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    TargetYearMonth,
                    new CloseBudgetMonthRequestDto(
                        BudgetMonthCarryOverModes.None,
                        CompletedSavingsGoalIds: new[] { seed.CompletableMonthGoalId })),
                CancellationToken.None));

        closeResult.IsSuccess.Should().BeTrue();

        var completed = await sut.MonthsRepo.GetCompletedSavingsGoalsAsync(
            seed.BudgetMonthId,
            CancellationToken.None);

        completed.Should().ContainSingle(g => g.Id == seed.CompletableMonthGoalId);
        var goal = completed.Single();
        goal.ClosedAt.Should().Be(CloseNowUtc);
        goal.TargetAmount.Should().Be(10_000m);
        // AmountSaved is the raw stored value — not mutated at close.
        goal.AmountSaved.Should().Be(9_500m);
        // MonthlyContribution is preserved so the caller can compute projected.
        goal.MonthlyContribution.Should().Be(500m);
    }

    // ---- seed and helpers ----------------------------------------------

    private sealed record SeedResult(
        Guid Persoid,
        Guid UserId,
        Guid BudgetId,
        Guid BudgetMonthId,
        Guid CompletableBaselineGoalId,
        Guid CompletableMonthGoalId,
        Guid BehindScheduleMonthGoalId,
        Guid NoTargetMonthGoalId);

    private async Task<SeedResult> SeedClosableMonthWithGoalsAsync(string yearMonth)
    {
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        // Income payment timing makes the close-window calculator accept
        // CloseNowUtc as inside the close window. Salary is paid on day 25;
        // close-window opens a few days before — matches the existing tests.
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();
            await conn.ExecuteAsync("""
                INSERT INTO Income
                (Id, BudgetId, NetSalaryMonthly, SalaryFrequency, IncomePaymentDayType, IncomePaymentDay, CreatedAt, CreatedByUserId)
                VALUES (UUID_TO_BIN(UUID()), UNHEX(REPLACE(@bid,'-','')), 30000, 0, 'dayOfMonth', 25, UTC_TIMESTAMP(), UNHEX(REPLACE(@pid,'-','')));
            """, new { bid = seed.BudgetId.ToString(), pid = seed.Persoid.ToString() });
        }

        // Three baseline goals:
        //   1. Completable: projected hits target exactly.
        //   2. BehindSchedule: projected far below target.
        //   3. NoTarget: TargetAmount NULL → must never be a candidate.
        var savingsId = Guid.NewGuid();
        var completableBaselineId = Guid.NewGuid();
        var behindBaselineId = Guid.NewGuid();
        var noTargetBaselineId = Guid.NewGuid();

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            await conn.ExecuteAsync("""
                INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedAt, CreatedByUserId)
                VALUES (@sid, @bid, 0, UTC_TIMESTAMP(), @uid);
            """, new { sid = savingsId, bid = seed.BudgetId, uid = seed.UserId });

            await conn.ExecuteAsync("""
                INSERT INTO SavingsGoal
                (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, MonthlyContribution, CreatedAt, CreatedByUserId)
                VALUES
                (@cid, @sid, 'Completable',     10000, '2026-12-31', 9500, 500, UTC_TIMESTAMP(), @uid),
                (@bid_, @sid, 'BehindSchedule', 10000, '2026-12-31', 1000, 500, UTC_TIMESTAMP(), @uid),
                (@nid, @sid, 'NoTarget',         NULL, '2026-12-31',  100, 500, UTC_TIMESTAMP(), @uid);
            """, new
            {
                cid = completableBaselineId,
                bid_ = behindBaselineId,
                nid = noTargetBaselineId,
                sid = savingsId,
                uid = seed.UserId
            });
        }

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: yearMonth,
            status: BudgetMonthStatuses.Open,
            openedAtUtc: new DateTime(2026, 04, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        // Force materialization now so the test can resolve month-row IDs
        // before any close call. Mirrors the dashboard-test pattern.
        var dbOpts = DbOptions(_db.ConnectionString);
        var clock = new FakeTimeProvider(CloseNowUtc);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSourceRepo = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSourceRepo, materializationRepo, clock);
        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, clock);

        var ensure = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.UserId, yearMonth, CancellationToken.None));
        ensure.IsSuccess.Should().BeTrue();
        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var monthGoalIds = await GetMonthGoalIdsBySourceAsync(
            budgetMonthId,
            completableBaselineId,
            behindBaselineId,
            noTargetBaselineId);

        return new SeedResult(
            Persoid: seed.Persoid,
            UserId: seed.UserId,
            BudgetId: seed.BudgetId,
            BudgetMonthId: budgetMonthId,
            CompletableBaselineGoalId: completableBaselineId,
            CompletableMonthGoalId: monthGoalIds[completableBaselineId],
            BehindScheduleMonthGoalId: monthGoalIds[behindBaselineId],
            NoTargetMonthGoalId: monthGoalIds[noTargetBaselineId]);
    }

    private async Task<Dictionary<Guid, Guid>> GetMonthGoalIdsBySourceAsync(
        Guid budgetMonthId,
        params Guid[] sourceIds)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<(Guid Id, Guid SourceSavingsGoalId)>("""
            SELECT g.Id, g.SourceSavingsGoalId
            FROM BudgetMonthSavingsGoal g
            JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
            WHERE s.BudgetMonthId = @BudgetMonthId
              AND g.SourceSavingsGoalId IN @SourceIds;
        """, new { BudgetMonthId = budgetMonthId, SourceIds = sourceIds });

        return rows.ToDictionary(r => r.SourceSavingsGoalId, r => r.Id);
    }

    private async Task<(string Status, string? ClosedReason)> GetMonthGoalStatusAsync(Guid monthGoalId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        var row = await conn.QuerySingleAsync<(string Status, string? ClosedReason)>(
            "SELECT Status, ClosedReason FROM BudgetMonthSavingsGoal WHERE Id = @Id;",
            new { Id = monthGoalId });
        return row;
    }

    private async Task<(string Status, string? ClosedReason)> GetBaselineGoalStatusAsync(Guid baselineGoalId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleAsync<(string Status, string? ClosedReason)>(
            "SELECT Status, ClosedReason FROM SavingsGoal WHERE Id = @Id;",
            new { Id = baselineGoalId });
    }

    private async Task<decimal?> GetMonthGoalAmountSavedAsync(Guid monthGoalId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleAsync<decimal?>(
            "SELECT AmountSaved FROM BudgetMonthSavingsGoal WHERE Id = @Id;",
            new { Id = monthGoalId });
    }

    private async Task<MonthRow?> GetMonthRowAsync(Guid budgetId, string yearMonth)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<MonthRow>(
            "SELECT Status FROM BudgetMonth WHERE BudgetId = @bid AND YearMonth = @ym LIMIT 1;",
            new { bid = budgetId, ym = yearMonth });
    }

    private sealed record MonthRow(string Status);

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required BudgetMonthRepository MonthsRepo { get; init; }
        public required BudgetMonthDashboardRepository MonthDashRepo { get; init; }
        public required CloseBudgetMonthCommandHandler CloseHandler { get; init; }
        public required GetSavingsGoalCompletionCandidatesQueryHandler CandidatesHandler { get; init; }
    }

    private Sut CreateSut(ITimeProvider clock)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var months = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var monthDashRepo = new BudgetMonthDashboardRepository(uow, NullLogger<BudgetMonthDashboardRepository>.Instance, dbOpts, clock);
        var seedSource = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, clock);
        var lifecycle = new BudgetMonthLifecycleService(months, materializer, clock);

        IBudgetMonthlyTotalsService totals = new BudgetMonthlyTotalsService(monthDashRepo);
        var closeSnapshot = new BudgetMonthCloseSnapshotService(totals);
        var auditWriter = new BudgetAuditWriter(uow, NullLogger<BudgetAuditWriter>.Instance, dbOpts);

        var savingsRepo = new BudgetMonthSavingsGoalMutationRepository(uow, NullLogger<BudgetMonthSavingsGoalMutationRepository>.Instance, dbOpts);
        var changeEventRepo = new BudgetMonthChangeEventRepository(uow, NullLogger<BudgetMonthChangeEventRepository>.Instance, dbOpts);

        var closeHandler = new CloseBudgetMonthCommandHandler(
            months,
            lifecycle,
            monthDashRepo,
            materializer,
            closeSnapshot,
            auditWriter,
            savingsRepo,
            changeEventRepo,
            clock);

        var candidatesHandler = new GetSavingsGoalCompletionCandidatesQueryHandler(months, savingsRepo);

        return new Sut
        {
            Uow = uow,
            MonthsRepo = months,
            MonthDashRepo = monthDashRepo,
            CloseHandler = closeHandler,
            CandidatesHandler = candidatesHandler,
        };
    }
}
