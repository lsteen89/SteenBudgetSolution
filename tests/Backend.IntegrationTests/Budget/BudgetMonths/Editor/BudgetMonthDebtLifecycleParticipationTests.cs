using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Materializer;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Debts;
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

/// <summary>
/// Debt PR 1 — schema/model foundation. Validates that source lifecycle on
/// <c>Debt</c> and month participation on <c>BudgetMonthDebt</c> are honored
/// end-to-end: materialization, dashboard payment/balance totals, editor
/// read model, and patch-handler guards.
/// </summary>
[Collection("it:db")]
public sealed class BudgetMonthDebtLifecycleParticipationTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthDebtLifecycleParticipationTests(MariaDbFixture db) => _db = db;

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

    // ---- Materialization filter ---------------------------------------------------------------

    [Theory]
    [InlineData(DebtSourceLifecycleStatuses.PaidOff)]
    [InlineData(DebtSourceLifecycleStatuses.Archived)]
    [InlineData(DebtSourceLifecycleStatuses.Deleted)]
    public async Task Materialize_SourceLifecycle_NonActive_DoesNotMaterialize(string lifecycle)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        await SetAllActiveDebtSourcesToLifecycleAsync(seed.BudgetId, lifecycle);

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        // Materialization should have produced zero debt rows for this month
        // because every source is now in a non-active lifecycle state.
        var monthDebtCount = await CountMonthDebtsAsync(budgetMonthId);
        monthDebtCount.Should().Be(0);
    }

    [Fact]
    public async Task Materialize_ActiveSource_ProducesIncludedRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorRowsAsync(seed.Persoid);
        rows.Should().NotBeEmpty();
        rows.Should().OnlyContain(r =>
            r.ParticipationStatus == BudgetMonthDebtParticipationStatuses.Included);
    }

    // ---- Editor read model ---------------------------------------------------------------------

    [Fact]
    public async Task EditorRead_ProjectsSourceLifecycle_AndParticipation()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorRowsAsync(seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");

        // Plan-linked rows surface the live source lifecycle via LEFT JOIN.
        creditCard.SourceDebtId.Should().NotBeNull();
        creditCard.SourceLifecycleStatus.Should().Be(DebtSourceLifecycleStatuses.Active);
        creditCard.ParticipationStatus.Should().Be(BudgetMonthDebtParticipationStatuses.Included);

        // Month-only rows report null source lifecycle.
        var monthOnlyId = await InsertMonthOnlyDebtAsync(budgetMonthId, name: "Klarna – Soffa", balance: 6400m, payment: 500m);
        rows = await GetEditorRowsAsync(seed.Persoid);
        var monthOnly = rows.First(r => r.Id == monthOnlyId);
        monthOnly.SourceDebtId.Should().BeNull();
        monthOnly.SourceLifecycleStatus.Should().BeNull();
    }

    // ---- Patch handler guards ------------------------------------------------------------------

    [Theory]
    [InlineData(BudgetMonthDebtParticipationStatuses.NotIncluded, "BudgetMonthDebt.RowNotIncluded")]
    [InlineData(BudgetMonthDebtParticipationStatuses.Removed, "BudgetMonthDebt.RowRemoved")]
    public async Task Patch_RejectsNonIncludedParticipation(string participation, string expectedErrorCode)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorRowsAsync(seed.Persoid)).First(r => r.Name == "Credit Card");
        var paymentBefore = target.MonthlyPayment;
        await SetParticipationAsync(target.Id, participation);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    paymentBefore + 100m,
                    BudgetMonthDebtEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(expectedErrorCode);

        // No mutation should have been applied.
        var monthAfter = await GetMonthDebtPaymentAsync(target.Id);
        monthAfter.Should().Be(paymentBefore);
    }

    [Fact]
    public async Task Patch_RejectsSourceLifecycle_PaidOff_Archived_Deleted()
    {
        foreach (var lifecycle in new[]
        {
            DebtSourceLifecycleStatuses.PaidOff,
            DebtSourceLifecycleStatuses.Archived,
            DebtSourceLifecycleStatuses.Deleted
        })
        {
            await _db.ResetAsync();
            var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
            var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
            await EnsureMonthAsync(sut, seed.Persoid);

            var target = (await GetEditorRowsAsync(seed.Persoid)).First(r => r.Name == "Credit Card");
            await SetSourceLifecycleAsync(target.SourceDebtId!.Value, lifecycle);

            var patch = await sut.Uow.InTx(CancellationToken.None, () =>
                sut.PatchHandler.Handle(
                    new PatchBudgetMonthDebtCommand(
                        seed.Persoid,
                        "2026-01",
                        target.Id,
                        target.MonthlyPayment + 50m,
                        BudgetMonthDebtEditScopes.CurrentMonthOnly),
                    CancellationToken.None));

            patch.IsFailure.Should().BeTrue();
            patch.Error!.Code.Should().Be(BudgetMonthDebtErrors.SourceLifecycleClosed.Code);
        }
    }

    [Fact]
    public async Task Patch_IncludedActiveRow_StillWorks()
    {
        // Sanity: PR 1 must not break the existing planned-payment patch path
        // for the only state combination that should still accept edits.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorRowsAsync(seed.Persoid)).First(r => r.Name == "Credit Card");

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    1234m,
                    BudgetMonthDebtEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        (await GetMonthDebtPaymentAsync(target.Id)).Should().Be(1234m);
    }

    // ---- Dashboard totals -----------------------------------------------------------------------

    [Fact]
    public async Task Dashboard_PaymentTotal_ExcludesNotIncludedAndRemoved()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorRowsAsync(seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");

        var totalsService = CreateTotalsService();

        var beforeTotals = await totalsService.ComputeAsync(budgetMonthId, CancellationToken.None);
        beforeTotals.Should().NotBeNull();
        var paymentsBefore = beforeTotals!.TotalDebtPayments;

        // Flip Credit Card to notIncluded. Its planned payment must drop out of the total.
        await SetParticipationAsync(creditCard.Id, BudgetMonthDebtParticipationStatuses.NotIncluded);
        var afterSkip = await totalsService.ComputeAsync(budgetMonthId, CancellationToken.None);
        afterSkip!.TotalDebtPayments.Should().Be(paymentsBefore - creditCard.MonthlyPayment);

        // Flip CSN to removed. Its payment must also drop.
        await SetParticipationAsync(csn.Id, BudgetMonthDebtParticipationStatuses.Removed);
        var afterRemove = await totalsService.ComputeAsync(budgetMonthId, CancellationToken.None);
        afterRemove!.TotalDebtPayments.Should().Be(paymentsBefore - creditCard.MonthlyPayment - csn.MonthlyPayment);
    }

    [Fact]
    public async Task Dashboard_LiabilityBalance_IncludesNotIncluded_ExcludesRemoved_ExcludesTerminatedSource()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorRowsAsync(seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");

        var totalsService = CreateTotalsService();
        var initial = await GetDashboardTotalDebtBalanceAsync(budgetMonthId);
        initial.Should().Be(creditCard.Balance + csn.Balance);

        // notIncluded: balance stays in liability total (still owed).
        await SetParticipationAsync(creditCard.Id, BudgetMonthDebtParticipationStatuses.NotIncluded);
        var afterSkip = await GetDashboardTotalDebtBalanceAsync(budgetMonthId);
        afterSkip.Should().Be(creditCard.Balance + csn.Balance);

        // removed: balance drops.
        await SetParticipationAsync(csn.Id, BudgetMonthDebtParticipationStatuses.Removed);
        var afterRemove = await GetDashboardTotalDebtBalanceAsync(budgetMonthId);
        afterRemove.Should().Be(creditCard.Balance);

        // Terminated source lifecycle: balance drops even for non-removed rows.
        await SetSourceLifecycleAsync(creditCard.SourceDebtId!.Value, DebtSourceLifecycleStatuses.PaidOff);
        var afterPaidOff = await GetDashboardTotalDebtBalanceAsync(budgetMonthId);
        afterPaidOff.Should().Be(0m);
    }

    [Fact]
    public async Task CloseSnapshot_ExcludesNotIncludedAndRemoved_FromPaymentTotal()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorRowsAsync(seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");
        var totalsService = CreateTotalsService();

        var includedOnlyTotal = (await totalsService.ComputeAsync(budgetMonthId, CancellationToken.None))!.TotalDebtPayments;
        includedOnlyTotal.Should().Be(creditCard.MonthlyPayment + csn.MonthlyPayment);

        await SetParticipationAsync(creditCard.Id, BudgetMonthDebtParticipationStatuses.NotIncluded);
        await SetParticipationAsync(csn.Id, BudgetMonthDebtParticipationStatuses.Removed);

        // Close-snapshot reads via the same totals service, so the snapshot
        // payment figure must drop both excluded rows.
        var snapshotTotals = await totalsService.ComputeAsync(budgetMonthId, CancellationToken.None);
        snapshotTotals!.TotalDebtPayments.Should().Be(0m);
    }

    // ---- Test helpers ---------------------------------------------------------------------------

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));
        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<BudgetMonthDebtEditorRowDto>> GetEditorDtosAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthDebtsQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<IReadOnlyList<DebtEditorReadRow>> GetEditorRowsAsync(Guid persoid)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        var rows = await conn.QueryAsync<DebtEditorReadRow>("""
            SELECT
                d.Id,
                d.SourceDebtId,
                d.Name,
                d.Balance,
                d.MonthlyPayment,
                d.ParticipationStatus,
                src.Status AS SourceLifecycleStatus
            FROM BudgetMonthDebt d
            JOIN BudgetMonth bm ON bm.Id = d.BudgetMonthId
            JOIN Budget b ON b.Id = bm.BudgetId
            LEFT JOIN Debt src ON src.Id = d.SourceDebtId
            WHERE b.Persoid = @persoid
            ORDER BY d.Balance DESC;
        """, new { persoid });
        return rows.AsList();
    }

    private async Task SetParticipationAsync(Guid monthDebtId, string participation)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt
            SET ParticipationStatus = @participation,
                ParticipationChangedAt = UTC_TIMESTAMP(),
                IsDeleted = CASE WHEN @participation = 'removed' THEN 1 ELSE IsDeleted END
            WHERE Id = @id;
        """, new { id = monthDebtId, participation });
    }

    private async Task SetSourceLifecycleAsync(Guid debtId, string lifecycle)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE Debt SET Status = @lifecycle WHERE Id = @id;
        """, new { id = debtId, lifecycle });
    }

    private async Task SetAllActiveDebtSourcesToLifecycleAsync(Guid budgetId, string lifecycle)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE Debt
            SET Status = @lifecycle
            WHERE BudgetId = @budgetId AND Status = 'active';
        """, new { budgetId, lifecycle });
    }

    private async Task<Guid> InsertMonthOnlyDebtAsync(
        Guid budgetMonthId, string name, decimal balance, decimal payment)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        var id = Guid.NewGuid();
        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonthDebt
              (Id, BudgetMonthId, SourceDebtId, Name, Type, Balance, Apr, MonthlyPayment,
               OpenedAt, Status, CreatedAt, CreatedByUserId)
            SELECT @id, @budgetMonthId, NULL, @name, 'installment', @balance, 0, @payment,
                   UTC_TIMESTAMP(), 'active', UTC_TIMESTAMP(), bm.CreatedByUserId
            FROM BudgetMonth bm WHERE bm.Id = @budgetMonthId;
        """, new { id, budgetMonthId, name, balance, payment });
        return id;
    }

    private async Task<int> CountMonthDebtsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM BudgetMonthDebt WHERE BudgetMonthId = @id;
        """, new { id = budgetMonthId });
    }

    private async Task<decimal> GetMonthDebtPaymentAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<decimal>("""
            SELECT MonthlyPayment FROM BudgetMonthDebt WHERE Id = @id;
        """, new { id = monthDebtId });
    }

    private async Task<decimal> GetDashboardTotalDebtBalanceAsync(Guid budgetMonthId)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var dashboardRepo = new BudgetMonthDashboardRepository(
            new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance),
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            dbOpts,
            new FakeTimeProvider(DateTime.UtcNow));

        var data = await dashboardRepo.GetDashboardDataForMonthAsync(budgetMonthId, CancellationToken.None);
        return data!.Totals.TotalDebtBalance;
    }

    private IBudgetMonthlyTotalsService CreateTotalsService()
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var dashboardRepo = new BudgetMonthDashboardRepository(
            new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance),
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            dbOpts,
            new FakeTimeProvider(DateTime.UtcNow));
        return new BudgetMonthlyTotalsService(dashboardRepo);
    }

    private sealed class DebtEditorReadRow
    {
        public Guid Id { get; init; }
        public Guid? SourceDebtId { get; init; }
        public string Name { get; init; } = string.Empty;
        public decimal Balance { get; init; }
        public decimal MonthlyPayment { get; init; }
        public string ParticipationStatus { get; init; } = string.Empty;
        public string? SourceLifecycleStatus { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthDebtsQueryHandler GetHandler { get; init; }
        public required PatchBudgetMonthDebtCommandHandler PatchHandler { get; init; }
    }

    private Sut CreateSut(DateTime utcNow)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(utcNow);

        var monthsRepo = new BudgetMonthRepository(
            uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSourceRepo = new BudgetMonthSeedSourceRepository(
            uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSourceRepo, materializationRepo, time);
        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var debtsRepo = new BudgetMonthDebtMutationRepository(
            uow, NullLogger<BudgetMonthDebtMutationRepository>.Instance, dbOpts);
        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow, NullLogger<BudgetMonthChangeEventRepository>.Instance, dbOpts);

        var timeProvider = new SettableTimeProvider(utcNow);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthDebtsQueryHandler(lifecycle, debtsRepo),
            PatchHandler = new PatchBudgetMonthDebtCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, timeProvider)
        };
    }

    private sealed class SettableTimeProvider : TimeProvider
    {
        private readonly DateTime _utcNow;
        public SettableTimeProvider(DateTime utcNow) => _utcNow = utcNow;
        public override DateTimeOffset GetUtcNow() => new(_utcNow, TimeSpan.Zero);
    }
}
