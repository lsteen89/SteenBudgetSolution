using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Constants;
using Backend.Application.Features.Wizard.Finalization;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.Finalization.Processing.Processors;
using Backend.Application.Features.Wizard.Finalization.Targets;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.Services.Debts;
using Backend.Domain.Abstractions;
using Backend.Domain.Shared;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Core;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Wizard;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MySqlConnector;

namespace Backend.IntegrationTests.Wizard;

/// <summary>
/// PR 1.5 — proves that the wizard's debt finalization path produces source
/// debts that materialize as <c>included</c>, <c>active</c>, not-deleted month
/// rows. Covers <c>WizardStepData</c> → <see cref="DebtStepProcessor"/> →
/// <see cref="FinalizeBudgetTarget"/> → <see cref="DebtsRepository"/> → DB,
/// followed by <see cref="BudgetMonthLifecycleService.EnsureAccessibleMonthAsync"/>
/// to trigger materialization. The default schema values (<c>Debt.Status =
/// 'active'</c>, <c>BudgetMonthDebt.ParticipationStatus = 'included'</c>) are
/// what guarantees this — this test exists so any future refactor that loses
/// that property fails loudly.
/// </summary>
[Collection("it:db")]
public sealed class WizardDebtFinalizationMaterializationTests
{
    private readonly MariaDbFixture _db;
    public WizardDebtFinalizationMaterializationTests(MariaDbFixture db) => _db = db;

    private sealed class TestCurrentUserContext : ICurrentUserContext
    {
        public Guid Persoid { get; set; }
        public string UserName { get; } = string.Empty;
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private static IOptions<Backend.Settings.DatabaseSettings> DbOptions(string cs)
        => Options.Create(new Backend.Settings.DatabaseSettings { ConnectionString = cs });

    [Fact]
    public async Task FinalizeWizard_WithDebts_PersistsActiveSources_AndMaterializesIncludedMonthRows()
    {
        await _db.ResetAsync();

        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await DbSeeds.SeedDefaultExpenseCategoriesAsync(_db.ConnectionString);
        await UserTestSeeds.SeedUserAsync(_db.ConnectionString, userId);
        await WizardSeeds.SeedSessionAsync(_db.ConnectionString, sessionId, userId);
        // Include income+expenditure too; income materialization is required before
        // the materializer reaches the debt path.
        await WizardSeeds.SeedIncomeAndExpenditureAsync(_db.ConnectionString, sessionId);
        await WizardSeeds.SeedDebtsAsync(_db.ConnectionString, sessionId);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var currentUser = new TestCurrentUserContext { Persoid = userId };

        var incomeRepo = new IncomeRepository(uow, NullLogger<IncomeRepository>.Instance, currentUser, dbOpts);
        var expRepo = new ExpenditureRepository(uow, NullLogger<ExpenditureRepository>.Instance, currentUser, dbOpts);
        var budgetRepo = new BudgetRepository(uow, NullLogger<BudgetRepository>.Instance, currentUser, dbOpts);
        var savingsRepoMock = new Mock<ISavingsRepository>(MockBehavior.Strict);
        var debtsRepo = new DebtsRepository(
            uow,
            NullLogger<DebtsRepository>.Instance,
            currentUser,
            new DebtPaymentCalculator(),
            dbOpts);

        var targetFactory = new FinalizeBudgetTargetFactory(
            incomeRepo,
            expRepo,
            savingsRepoMock.Object,
            debtsRepo,
            budgetRepo);

        var wizardRepo = new SqlWizardRepositoryForTests(_db.ConnectionString);
        var processors = new IWizardStepProcessor[]
        {
            new IncomeStepProcessor(NullLogger<IncomeStepProcessor>.Instance),
            new ExpenseStepProcessor(NullLogger<ExpenseStepProcessor>.Instance),
            new DebtStepProcessor(NullLogger<DebtStepProcessor>.Instance),
        };

        var orchestrator = new MinimalOrchestrator(wizardRepo, processors, NullLogger<MinimalOrchestrator>.Instance);

        var userRepoMock = new Mock<IUserRepository>();
        userRepoMock.Setup(x => x.SetFirstTimeLoginAsync(userId, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(true);

        var finalize = new FinalizeWizardCommandHandler(
            wizardRepo,
            budgetRepo,
            userRepoMock.Object,
            orchestrator,
            targetFactory,
            NullLogger<FinalizeWizardCommandHandler>.Instance);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var finalizeResult = await finalize.Handle(new FinalizeWizardCommand(sessionId, userId), CancellationToken.None);
        if (finalizeResult.IsSuccess)
            await uow.CommitAsync(CancellationToken.None);
        else
            await uow.RollbackAsync(CancellationToken.None);

        finalizeResult.IsSuccess.Should().BeTrue(
            finalizeResult.IsFailure ? $"{finalizeResult.Error.Code} - {finalizeResult.Error.Description}" : "");

        // Assert source debts were created with lifecycle = active.
        await using (var probe = new MySqlConnection(_db.ConnectionString))
        {
            var sourceRows = (await probe.QueryAsync<DebtSourceRow>("""
                SELECT Name, Status, PaidOffAt, ArchivedAt, DeletedAt
                FROM Debt
                WHERE BudgetId IN (SELECT Id FROM Budget WHERE Persoid = UNHEX(REPLACE(@pid,'-','')))
                ORDER BY Name;
            """, new { pid = userId.ToString() })).AsList();

            sourceRows.Should().HaveCount(2);
            sourceRows.Should().OnlyContain(r => r.Status == DebtSourceLifecycleStatuses.Active);
            sourceRows.Should().OnlyContain(r =>
                r.PaidOffAt == null && r.ArchivedAt == null && r.DeletedAt == null);
            sourceRows.Select(r => r.Name).Should().BeEquivalentTo(new[] { "Credit Card", "CSN" });
        }

        // Now materialize the current month and assert the month rows.
        var time = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSourceRepo = new BudgetMonthSeedSourceRepository(
            uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSourceRepo, materializationRepo, time);
        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var ensure = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(userId, userId, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse(
            ensure.IsFailure ? $"{ensure.Error.Code} - {ensure.Error.Description}" : "");

        await using var verify = new MySqlConnection(_db.ConnectionString);
        var monthRows = (await verify.QueryAsync<DebtMonthRow>("""
            SELECT
                d.Name,
                d.Status,
                d.IsDeleted,
                d.ParticipationStatus
            FROM BudgetMonthDebt d
            WHERE d.BudgetMonthId = UNHEX(REPLACE(@bm,'-',''))
            ORDER BY d.Name;
        """, new { bm = ensure.Value!.BudgetMonthId.ToString() })).AsList();

        monthRows.Should().HaveCount(2);
        monthRows.Should().OnlyContain(r => r.Status == "active");
        monthRows.Should().OnlyContain(r => r.IsDeleted == false);
        monthRows.Should().OnlyContain(r =>
            r.ParticipationStatus == BudgetMonthDebtParticipationStatuses.Included);
        monthRows.Select(r => r.Name).Should().BeEquivalentTo(new[] { "Credit Card", "CSN" });
    }

    private sealed record DebtSourceRow(
        string Name,
        string Status,
        DateTime? PaidOffAt,
        DateTime? ArchivedAt,
        DateTime? DeletedAt);

    private sealed record DebtMonthRow(
        string Name,
        string Status,
        bool IsDeleted,
        string ParticipationStatus);

    /// <summary>
    /// Test-local orchestrator equivalent to the one inside FinalizeWizardFlowTests.
    /// Runs each step processor against the wizard step rows in ascending order.
    /// </summary>
    private sealed class MinimalOrchestrator : IWizardStepOrchestrator
    {
        private readonly IWizardRepository _wizardRepo;
        private readonly IReadOnlyDictionary<int, IWizardStepProcessor> _processors;
        private readonly ILogger<MinimalOrchestrator> _logger;

        public MinimalOrchestrator(
            IWizardRepository wizardRepo,
            IEnumerable<IWizardStepProcessor> processors,
            ILogger<MinimalOrchestrator> logger)
        {
            _wizardRepo = wizardRepo;
            _processors = processors.ToDictionary(p => p.StepNumber);
            _logger = logger;
        }

        public async Task<Result> RunAsync(Guid sessionId, IWizardFinalizationTarget target, CancellationToken ct)
        {
            var rows = await _wizardRepo.GetRawStepDataForFinalizationAsync(sessionId, ct);
            foreach (var row in rows.OrderBy(r => r.StepNumber).ThenBy(r => r.SubStep))
            {
                if (!_processors.TryGetValue(row.StepNumber, out var proc))
                    return Result.Failure(new Error("Wizard.MissingProcessor", $"No processor registered for step {row.StepNumber}."));

                var res = await proc.ProcessAsync(row.StepData, target, ct);
                if (res.IsFailure)
                {
                    _logger.LogWarning("Wizard step {Step} failed: {Code} - {Desc}", row.StepNumber, res.Error.Code, res.Error.Description);
                    return res;
                }
            }
            return Result.Success();
        }
    }
}
