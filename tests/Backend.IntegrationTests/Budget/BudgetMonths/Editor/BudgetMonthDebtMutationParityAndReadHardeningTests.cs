using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;
using Backend.Application.Services.Budget.Materializer;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
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
/// PR 1.5 — single vs bulk planned-payment patch parity + default editor read
/// hiding <c>ParticipationStatus = 'removed'</c> even when legacy
/// <c>IsDeleted = 0</c>. Proves the shared <c>DebtMutationGuard</c> blocks the
/// same lifecycle / participation states from both single and bulk handlers,
/// and that bulk rejection remains all-or-nothing (no partial mutation or
/// partial audit).
/// </summary>
[Collection("it:db")]
public sealed class BudgetMonthDebtMutationParityAndReadHardeningTests
{
    private readonly MariaDbFixture _db;
    public BudgetMonthDebtMutationParityAndReadHardeningTests(MariaDbFixture db) => _db = db;

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

    // ---- Default editor read --------------------------------------------------------------------

    [Fact]
    public async Task EditorRead_HidesRemovedRow_EvenWhenIsDeletedZero()
    {
        // Regression: the participation column is now authoritative, so a row
        // with ParticipationStatus = 'removed' must drop out of the default
        // editor read even when the legacy IsDeleted flag is still 0.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var rowsBefore = await GetEditorDtosAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");

        await SetParticipationOnlyAsync(creditCard.Id, BudgetMonthDebtParticipationStatuses.Removed);

        // Sanity: the legacy flag is unchanged.
        var legacyFlag = await GetLegacyIsDeletedAsync(creditCard.Id);
        legacyFlag.Should().BeFalse();

        var rowsAfter = await GetEditorDtosAsync(sut, seed.Persoid);
        rowsAfter.Should().NotContain(r => r.Id == creditCard.Id,
            because: "default editor read must hide ParticipationStatus = 'removed' rows");
        rowsAfter.Should().Contain(r => r.Name == "CSN",
            because: "other included rows must remain visible");
    }

    [Fact]
    public async Task EditorRead_HidesLegacyDeletedRow_EvenWhenParticipationIsIncluded()
    {
        // Sanity for the other half of the gate: legacy IsDeleted = 1 still
        // hides a row whose participation defaulted to 'included'.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var rowsBefore = await GetEditorDtosAsync(sut, seed.Persoid);
        var csn = rowsBefore.First(r => r.Name == "CSN");

        await SetLegacyIsDeletedOnlyAsync(csn.Id);

        var rowsAfter = await GetEditorDtosAsync(sut, seed.Persoid);
        rowsAfter.Should().NotContain(r => r.Id == csn.Id);
    }

    // ---- Bulk parity: participation -------------------------------------------------------------

    [Theory]
    [InlineData(BudgetMonthDebtParticipationStatuses.NotIncluded, "BudgetMonthDebt.RowNotIncluded")]
    [InlineData(BudgetMonthDebtParticipationStatuses.Removed, "BudgetMonthDebt.RowRemoved")]
    public async Task BulkPatch_RejectsNonIncludedParticipation_AndStaysAllOrNothing(
        string participation, string expectedErrorCode)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorDtosAsync(sut, seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");
        var creditCardBefore = creditCard.MonthlyPayment;
        var csnBefore = csn.MonthlyPayment;

        // Put one row into the non-included state; the other stays valid. Bulk
        // must reject the whole request and leave the valid row untouched.
        await SetParticipationOnlyAsync(creditCard.Id, participation);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            creditCard.Id, creditCardBefore + 100m, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            csn.Id, csnBefore + 50m, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                    }),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(expectedErrorCode);

        (await GetMonthDebtPaymentAsync(creditCard.Id)).Should().Be(creditCardBefore);
        (await GetMonthDebtPaymentAsync(csn.Id)).Should().Be(csnBefore);
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    // ---- Bulk parity: source lifecycle ----------------------------------------------------------

    [Theory]
    [InlineData(DebtSourceLifecycleStatuses.PaidOff)]
    [InlineData(DebtSourceLifecycleStatuses.Archived)]
    [InlineData(DebtSourceLifecycleStatuses.Deleted)]
    public async Task BulkPatch_RejectsTerminalSourceLifecycle_AndStaysAllOrNothing(string lifecycle)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorDtosAsync(sut, seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");
        var creditCardBefore = creditCard.MonthlyPayment;
        var csnBefore = csn.MonthlyPayment;

        await SetSourceLifecycleAsync(creditCard.SourceDebtId!.Value, lifecycle);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            creditCard.Id, creditCardBefore + 100m, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            csn.Id, csnBefore + 50m, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                    }),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonthDebtErrors.SourceLifecycleClosed.Code);

        (await GetMonthDebtPaymentAsync(creditCard.Id)).Should().Be(creditCardBefore);
        (await GetMonthDebtPaymentAsync(csn.Id)).Should().Be(csnBefore);
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task BulkPatch_AllIncludedActiveRows_StillApply()
    {
        // Sanity: parity guards must not block the valid-state happy path.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetEditorDtosAsync(sut, seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            creditCard.Id, 1234m, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            csn.Id, 567m, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                    }),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        (await GetMonthDebtPaymentAsync(creditCard.Id)).Should().Be(1234m);
        (await GetMonthDebtPaymentAsync(csn.Id)).Should().Be(567m);
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(2);
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
            sut.GetHandler.Handle(new GetBudgetMonthDebtsQuery(persoid, "2026-01"), CancellationToken.None));
        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task SetParticipationOnlyAsync(Guid monthDebtId, string participation)
    {
        // Important: do NOT mirror to IsDeleted here. The regression case
        // EditorRead_HidesRemovedRow_EvenWhenIsDeletedZero depends on
        // participation alone driving visibility.
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt
            SET ParticipationStatus = @participation,
                ParticipationChangedAt = UTC_TIMESTAMP()
            WHERE Id = @id;
        """, new { id = monthDebtId, participation });
    }

    private async Task SetLegacyIsDeletedOnlyAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt SET IsDeleted = 1 WHERE Id = @id;
        """, new { id = monthDebtId });
    }

    private async Task<bool> GetLegacyIsDeletedAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<bool>("""
            SELECT IsDeleted FROM BudgetMonthDebt WHERE Id = @id;
        """, new { id = monthDebtId });
    }

    private async Task SetSourceLifecycleAsync(Guid debtId, string lifecycle)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("UPDATE Debt SET Status = @lifecycle WHERE Id = @id;",
            new { id = debtId, lifecycle });
    }

    private async Task<decimal> GetMonthDebtPaymentAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<decimal>("""
            SELECT MonthlyPayment FROM BudgetMonthDebt WHERE Id = @id;
        """, new { id = monthDebtId });
    }

    private async Task<int> CountChangeEventsAsync(Guid budgetMonthId, string changeType)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'debt'
              AND ChangeType = @changeType;
        """, new { budgetMonthId, changeType });
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthDebtsQueryHandler GetHandler { get; init; }
        public required PatchBudgetMonthDebtsBulkCommandHandler BulkHandler { get; init; }
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
            BulkHandler = new PatchBudgetMonthDebtsBulkCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, timeProvider),
        };
    }

    private sealed class SettableTimeProvider : TimeProvider
    {
        private readonly DateTime _utcNow;
        public SettableTimeProvider(DateTime utcNow) => _utcNow = utcNow;
        public override DateTimeOffset GetUtcNow() => new(_utcNow, TimeSpan.Zero);
    }
}
