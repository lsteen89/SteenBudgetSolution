using System;
using System.Threading;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Months.GetBudgetMonthsStatus;
using Backend.Infrastructure.Data;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.IntegrationTests.Shared;
using Backend.Settings;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Backend.Application.DTO.Budget.Months;

namespace Backend.IntegrationTests.Budget.BudgetMonths;

[Collection("it:db")]
public sealed class GetBudgetMonthsStatusQueryHandlerTests
{
    private readonly MariaDbFixture _db;
    public GetBudgetMonthsStatusQueryHandlerTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs, DefaultCommandTimeoutSeconds = 30 });

    private static ITimeProvider FixedUtc(DateTime utcNow) => new FakeTimeProvider(utcNow);

    [Fact]
    public async Task GetStatus_ReturnsNull_WhenBudgetNotFoundForPersoid()
    {
        await _db.ResetAsync();

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        var clock = FixedUtc(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var handler = new GetBudgetMonthsStatusQueryHandler(repo, clock);

        var res = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new GetBudgetMonthsStatusQuery(Guid.NewGuid()), CancellationToken.None));

        res.IsFailure.Should().BeFalse();
        res.Value.Should().BeNull();
    }

    [Fact]
    public async Task GetStatus_WhenNoMonths_ReturnsCreateFirstMonth()
    {
        await _db.ResetAsync();

        var (persoid, _, _) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        var clock = FixedUtc(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var handler = new GetBudgetMonthsStatusQueryHandler(repo, clock);

        var res = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new GetBudgetMonthsStatusQuery(persoid), CancellationToken.None));

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();

        res.Value!.CurrentYearMonth.Should().Be("2026-01");
        res.Value.OpenMonthYearMonth.Should().BeNull();
        res.Value.GapMonthsCount.Should().Be(0);
        res.Value.Months.Should().BeEmpty();
        res.Value.SuggestedAction.Should().Be(BudgetMonthSuggestedActions.CreateFirstMonth);
    }

    [Fact]
    public async Task GetStatus_WhenOpenIsCurrent_ReturnsNoneAndGapZero()
    {
        await _db.ResetAsync();

        var (persoid, userId, budgetId) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-01",
            openedAtUtc: new DateTime(2026, 01, 02, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        var clock = FixedUtc(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var handler = new GetBudgetMonthsStatusQueryHandler(repo, clock);

        var res = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new GetBudgetMonthsStatusQuery(persoid), CancellationToken.None));

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();

        res.Value!.OpenMonthYearMonth.Should().Be("2026-01");
        res.Value.CurrentYearMonth.Should().Be("2026-01");
        res.Value.GapMonthsCount.Should().Be(0);
        res.Value.SuggestedAction.Should().Be(BudgetMonthSuggestedActions.None);
        res.Value.Months.Should().ContainSingle(m => m.YearMonth == "2026-01" && m.Status == "open");
    }

    [Fact]
    public async Task GetStatus_WhenOpenBehindCurrent_ComputesGapAndPrompts()
    {
        await _db.ResetAsync();

        var (persoid, userId, budgetId) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2025-11",
            openedAtUtc: new DateTime(2025, 11, 02, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        var clock = FixedUtc(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var handler = new GetBudgetMonthsStatusQueryHandler(repo, clock);

        var res = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new GetBudgetMonthsStatusQuery(persoid), CancellationToken.None));

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();

        res.Value!.OpenMonthYearMonth.Should().Be("2025-11");
        res.Value.CurrentYearMonth.Should().Be("2026-01");
        res.Value.GapMonthsCount.Should().Be(2);
        res.Value.SuggestedAction.Should().Be(BudgetMonthSuggestedActions.PromptStartCurrent);
    }

    [Fact]
    public async Task GetStatus_WhenMultipleOpenMonths_PicksNewestOpenedAt()
    {
        await _db.ResetAsync();

        var (persoid, userId, budgetId) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        await BudgetMonthDsl.InsertOpenAsync(_db.ConnectionString, budgetId, "2025-12",
            new DateTime(2025, 12, 01, 10, 00, 00, DateTimeKind.Utc), userId);

        await BudgetMonthDsl.InsertOpenAsync(_db.ConnectionString, budgetId, "2026-01",
            new DateTime(2026, 01, 05, 10, 00, 00, DateTimeKind.Utc), userId);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        var clock = FixedUtc(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var handler = new GetBudgetMonthsStatusQueryHandler(repo, clock);

        var res = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new GetBudgetMonthsStatusQuery(persoid), CancellationToken.None));

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();
        res.Value!.OpenMonthYearMonth.Should().Be("2026-01");
    }
}
