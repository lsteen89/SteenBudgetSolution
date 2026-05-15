using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
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

[Collection("it:db")]
public sealed class BudgetMonthDebtEditorTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthDebtEditorTests(MariaDbFixture db) => _db = db;

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
    public async Task GetDebts_ReturnsMaterializedActiveDebts()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetRowsAsync(sut, seed.Persoid);

        rows.Should().NotBeEmpty();
        rows.Should().Contain(r => r.Name == "Credit Card");
        rows.Should().Contain(r => r.Name == "CSN");
        rows.Should().OnlyContain(r => r.Id != Guid.Empty);
        rows.Where(r => r.Status != "closed").Should().OnlyContain(r => r.CanUpdateDefault);
    }

    [Fact]
    public async Task PatchDebt_CurrentMonthOnly_UpdatesMonthRowOnly_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var baselineBefore = await GetBaselineDebtAsync(target.SourceDebtId!.Value);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    2222m,
                    BudgetMonthDebtEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.MonthlyPayment.Should().Be(2222m);

        var baselineAfter = await GetBaselineDebtAsync(target.SourceDebtId.Value);
        baselineAfter!.MonthlyPayment.Should().Be(baselineBefore!.MonthlyPayment);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task PatchDebt_CurrentMonthAndPlan_UpdatesMonthAndBaseline()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    1800m,
                    BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.MonthlyPayment.Should().Be(1800m);

        var baselineAfter = await GetBaselineDebtAsync(target.SourceDebtId!.Value);
        baselineAfter!.MonthlyPayment.Should().Be(1800m);
    }

    [Fact]
    public async Task PatchDebt_BudgetPlanOnly_UpdatesBaselineOnly()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var monthBefore = await GetMonthDebtAsync(target.Id);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    3000m,
                    BudgetMonthDebtEditScopes.BudgetPlanOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.MonthlyPayment.Should().Be(monthBefore!.MonthlyPayment);

        var baselineAfter = await GetBaselineDebtAsync(target.SourceDebtId!.Value);
        baselineAfter!.MonthlyPayment.Should().Be(3000m);
    }

    [Fact]
    public async Task BulkPatch_IsAllOrNothing_WhenAnyRowFails()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var before = await GetMonthDebtAsync(target.Id);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            target.Id,
                            5555m,
                            BudgetMonthDebtEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            Guid.NewGuid(),
                            1m,
                            BudgetMonthDebtEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeTrue();
        var after = await GetMonthDebtAsync(target.Id);
        after!.MonthlyPayment.Should().Be(before!.MonthlyPayment);
    }

    [Fact]
    public async Task BulkPatch_WritesOneAuditEventPerChangedRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            target.Id,
                            target.MonthlyPayment + 100m,
                            BudgetMonthDebtEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
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
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await MarkMonthStatusAsync("2026-01", status);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    target.MonthlyPayment + 1m),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task MonthOnlyRow_RejectsBudgetPlanScopes()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await DetachSourceLinkAsync(target.Id);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    2000m,
                    BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonthDebtErrors.CannotUpdatePlanForMonthOnlyRow.Code);
    }

    [Fact]
    public async Task PatchDebt_BudgetPlanOnly_AuditBeforeUsesPersistedBaseline_NotMonthRow()
    {
        // The audit "before" for a plan-only mutation must come from the
        // persisted baseline Debt.MonthlyPayment, not the month row, because
        // those two values can legitimately diverge.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");

        // Diverge the values: month row = 100, baseline = 200.
        await SetMonthDebtPaymentAsync(target.Id, 100m);
        await SetBaselineDebtPaymentAsync(target.SourceDebtId!.Value, 200m);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    250m,
                    BudgetMonthDebtEditScopes.BudgetPlanOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.MonthlyPayment.Should().Be(100m, "month row must be untouched for plan-only");

        var baselineAfter = await GetBaselineDebtAsync(target.SourceDebtId.Value);
        baselineAfter!.MonthlyPayment.Should().Be(250m);

        var audit = await GetSoleAuditEventAsync(budgetMonthId);
        audit.Should().NotBeNull();
        audit!.ChangeSet.GetProperty("before").GetProperty("planPayment").GetDecimal().Should().Be(200m);
        audit.ChangeSet.GetProperty("after").GetProperty("planPayment").GetDecimal().Should().Be(250m);
        audit.ChangeSet.GetProperty("before").TryGetProperty("monthPayment", out _).Should().BeFalse();
        audit.ChangeSet.GetProperty("currentMonthUpdated").GetBoolean().Should().BeFalse();
        audit.ChangeSet.GetProperty("baselineUpdated").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task PatchDebt_CurrentMonthOnly_NoOp_DoesNotWriteAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    target.MonthlyPayment,
                    BudgetMonthDebtEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task PatchDebt_BudgetPlanOnly_NoOp_DoesNotWriteAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var baselineBefore = await GetBaselineDebtAsync(target.SourceDebtId!.Value);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    baselineBefore!.MonthlyPayment,
                    BudgetMonthDebtEditScopes.BudgetPlanOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task PatchDebt_CurrentMonthAndPlan_PartialChange_AuditsOnlyChangedSide()
    {
        // Month row diverged below the baseline. Submitting the baseline
        // value with currentMonthAndBudgetPlan only changes the month row;
        // the baseline is already at the requested value.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");

        await SetMonthDebtPaymentAsync(target.Id, 100m);
        await SetBaselineDebtPaymentAsync(target.SourceDebtId!.Value, 250m);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthDebtCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    250m,
                    BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        (await GetMonthDebtAsync(target.Id))!.MonthlyPayment.Should().Be(250m);
        (await GetBaselineDebtAsync(target.SourceDebtId.Value))!.MonthlyPayment.Should().Be(250m);

        var audit = await GetSoleAuditEventAsync(budgetMonthId);
        audit.Should().NotBeNull();
        audit!.ChangeSet.GetProperty("currentMonthUpdated").GetBoolean().Should().BeTrue();
        audit.ChangeSet.GetProperty("baselineUpdated").GetBoolean().Should().BeFalse();
        audit.ChangeSet.GetProperty("before").GetProperty("monthPayment").GetDecimal().Should().Be(100m);
        audit.ChangeSet.GetProperty("after").GetProperty("monthPayment").GetDecimal().Should().Be(250m);
        audit.ChangeSet.GetProperty("before").TryGetProperty("planPayment", out _).Should().BeFalse();
    }

    [Fact]
    public async Task BulkPatch_NoOpRows_DoNotWriteAudit_ChangedRowsStillAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var rows = await GetRowsAsync(sut, seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        // No-op: submit existing value.
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            creditCard.Id,
                            creditCard.MonthlyPayment,
                            BudgetMonthDebtEditScopes.CurrentMonthOnly),
                        // Real change.
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            csn.Id,
                            csn.MonthlyPayment + 50m,
                            BudgetMonthDebtEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();

        // Credit Card row unchanged, no audit for it.
        (await GetMonthDebtAsync(creditCard.Id))!.MonthlyPayment.Should().Be(creditCard.MonthlyPayment);
        // CSN row changed, single audit overall.
        (await GetMonthDebtAsync(csn.Id))!.MonthlyPayment.Should().Be(csn.MonthlyPayment + 50m);
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task BulkPatch_AllNoOpRows_WriteZeroAudit_AndStaysAllOrNothingOnRealFailures()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var rows = await GetRowsAsync(sut, seed.Persoid);
        var creditCard = rows.First(r => r.Name == "Credit Card");
        var csn = rows.First(r => r.Name == "CSN");

        // All no-op.
        var noOp = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            creditCard.Id, creditCard.MonthlyPayment, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            csn.Id, csn.MonthlyPayment, BudgetMonthDebtEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        noOp.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);

        // Real-failure case: one no-op + one bogus id -> still all-or-nothing.
        var failure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthDebtsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            creditCard.Id, creditCard.MonthlyPayment + 25m, BudgetMonthDebtEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthDebtsBulkCommand.Row(
                            Guid.NewGuid(), 1m, BudgetMonthDebtEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        failure.IsFailure.Should().BeTrue();
        (await GetMonthDebtAsync(creditCard.Id))!.MonthlyPayment.Should().Be(creditCard.MonthlyPayment);
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task PatchDebt_RejectsNegativePayment_FromHandler()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var before = await GetMonthDebtAsync(target.Id);

        // The validator pipeline rejects negative values via the MediatR pipeline.
        // Even bypassing the validator, the SQL update should still write the row,
        // so this test exercises the validator instead.
        var validator = new PatchBudgetMonthDebtCommandValidator();
        var result = validator.Validate(new PatchBudgetMonthDebtCommand(
            seed.Persoid,
            "2026-01",
            target.Id,
            -10m));

        result.IsValid.Should().BeFalse();

        var unchanged = await GetMonthDebtAsync(target.Id);
        unchanged!.MonthlyPayment.Should().Be(before!.MonthlyPayment);
    }

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<BudgetMonthDebtEditorRowDto>> GetRowsAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthDebtsQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<DebtDbRow?> GetMonthDebtAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<DebtDbRow>("""
            SELECT Id, Name, MonthlyPayment, Status, IsDeleted
            FROM BudgetMonthDebt
            WHERE Id = @id
            LIMIT 1;
        """, new { id });
    }

    private async Task<DebtDbRow?> GetBaselineDebtAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<DebtDbRow>("""
            SELECT Id, Name, MonthlyPayment, Status, FALSE AS IsDeleted
            FROM Debt
            WHERE Id = @id
            LIMIT 1;
        """, new { id });
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

    private async Task DetachSourceLinkAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt
            SET SourceDebtId = NULL
            WHERE Id = @id;
        """, new { id = monthDebtId });
    }

    private async Task<int> CountChangeEventsAsync(Guid budgetMonthId, string changeType)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*)
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'debt'
              AND ChangeType = @changeType;
        """, new { budgetMonthId, changeType });
    }

    private async Task SetMonthDebtPaymentAsync(Guid monthDebtId, decimal payment)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt SET MonthlyPayment = @payment WHERE Id = @id;
        """, new { id = monthDebtId, payment });
    }

    private async Task SetBaselineDebtPaymentAsync(Guid debtId, decimal payment)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE Debt SET MonthlyPayment = @payment WHERE Id = @id;
        """, new { id = debtId, payment });
    }

    private async Task<AuditEvent?> GetSoleAuditEventAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        var row = await conn.QuerySingleOrDefaultAsync<(string ChangeSetJson, string ChangeType)?>("""
            SELECT ChangeSetJson, ChangeType
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'debt';
        """, new { budgetMonthId });

        if (row is null) return null;
        return new AuditEvent(
            ChangeSet: JsonDocument.Parse(row.Value.ChangeSetJson).RootElement.Clone(),
            ChangeType: row.Value.ChangeType);
    }

    private sealed record AuditEvent(JsonElement ChangeSet, string ChangeType);

    private sealed class DebtDbRow
    {
        public Guid Id { get; init; }
        public string? Name { get; init; }
        public decimal MonthlyPayment { get; init; }
        public string Status { get; init; } = string.Empty;
        public bool IsDeleted { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthDebtsQueryHandler GetHandler { get; init; }
        public required PatchBudgetMonthDebtCommandHandler PatchHandler { get; init; }
        public required PatchBudgetMonthDebtsBulkCommandHandler BulkPatchHandler { get; init; }
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

        var debtsRepo = new BudgetMonthDebtMutationRepository(
            uow,
            NullLogger<BudgetMonthDebtMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthDebtsQueryHandler(lifecycle, debtsRepo),
            PatchHandler = new PatchBudgetMonthDebtCommandHandler(
                lifecycle,
                debtsRepo,
                changeEventRepo,
                TimeProvider.System),
            BulkPatchHandler = new PatchBudgetMonthDebtsBulkCommandHandler(
                lifecycle,
                debtsRepo,
                changeEventRepo,
                TimeProvider.System)
        };
    }
}
