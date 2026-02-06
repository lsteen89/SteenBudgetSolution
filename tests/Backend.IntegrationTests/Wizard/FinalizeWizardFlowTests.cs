using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Wizard.Finalization;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.Finalization.Processing.Processors;
using Backend.Application.Features.Wizard.Finalization.Targets;
using Backend.Domain.Abstractions;
using Backend.Domain.Shared;
using Backend.Infrastructure.Repositories.Budget.Core;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Wizard;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MySqlConnector;
using Dapper;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;

namespace Backend.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class FinalizeWizardFlowTests
{
    private readonly MariaDbFixture _db;
    public FinalizeWizardFlowTests(MariaDbFixture db) => _db = db;

    private sealed class TestCurrentUserContext : ICurrentUserContext
    {
        public Guid Persoid { get; set; }
        public string UserName { get; } = string.Empty;
    }

    // Keep options helper
    private static IOptions<Backend.Settings.DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new Backend.Settings.DatabaseSettings { ConnectionString = cs });

    // Small, test-local orchestrator: uses real processors + real target.
    private sealed class TestWizardStepOrchestrator : IWizardStepOrchestrator
    {
        private readonly IWizardRepository _wizardRepo;
        private readonly IReadOnlyDictionary<int, IWizardStepProcessor> _processors;
        private readonly ILogger<TestWizardStepOrchestrator> _logger;

        public TestWizardStepOrchestrator(
            IWizardRepository wizardRepo,
            IEnumerable<IWizardStepProcessor> processors,
            ILogger<TestWizardStepOrchestrator> logger)
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

    private sealed record SutBundle(
        UnitOfWork Uow,
        SqlWizardRepositoryForTests WizardRepo,
        FinalizeWizardCommandHandler Sut
    );

    private SutBundle BuildSut(Guid userId, bool simulateDeleteFailure = false)
    {
        var dbOpts = DbOptions(_db.ConnectionString);

        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var currentUser = new TestCurrentUserContext { Persoid = userId };

        // real repos used by FinalizeBudgetTarget
        var incomeRepo = new IncomeRepository(uow, NullLogger<IncomeRepository>.Instance, currentUser, dbOpts);
        var expRepo = new ExpenditureRepository(uow, NullLogger<ExpenditureRepository>.Instance, currentUser, dbOpts);
        var budgetRepo = new BudgetRepository(uow, NullLogger<BudgetRepository>.Instance, currentUser, dbOpts);

        // not used unless you add processors for their steps
        var savingsRepoMock = new Mock<ISavingsRepository>(MockBehavior.Strict);
        var debtsRepoMock = new Mock<IDebtsRepository>(MockBehavior.Strict);

        var targetFactory = new FinalizeBudgetTargetFactory(
            incomeRepo,
            expRepo,
            savingsRepoMock.Object,
            debtsRepoMock.Object,
            budgetRepo);

        var wizardRepo = new SqlWizardRepositoryForTests(_db.ConnectionString)
        {
            SimulateDeleteFailure = simulateDeleteFailure
        };

        var processors = new IWizardStepProcessor[]
        {
            new IncomeStepProcessor(NullLogger<IncomeStepProcessor>.Instance),
            new ExpenseStepProcessor(NullLogger<ExpenseStepProcessor>.Instance),
        };

        var orchestrator = new TestWizardStepOrchestrator(
            wizardRepo,
            processors,
            NullLogger<TestWizardStepOrchestrator>.Instance);

        var userRepoMock = new Mock<IUserRepository>();
        userRepoMock.Setup(x => x.SetFirstTimeLoginAsync(userId, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(true);

        var sut = new FinalizeWizardCommandHandler(
            wizardRepo,
            budgetRepo,
            userRepoMock.Object,
            orchestrator,
            targetFactory,
            NullLogger<FinalizeWizardCommandHandler>.Instance);

        return new SutBundle(uow, wizardRepo, sut);
    }

    [Fact]
    public async Task Given_ValidSteps_When_Finalize_Then_Commits_And_Writes_All()
    {
        await _db.ResetAsync();

        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await DbSeeds.SeedDefaultExpenseCategoriesAsync(_db.ConnectionString);
        await UserTestSeeds.SeedUserAsync(_db.ConnectionString, userId);

        await WizardSeeds.SeedSessionAsync(_db.ConnectionString, sessionId, userId);
        await WizardSeeds.SeedIncomeAndExpenditureAsync(_db.ConnectionString, sessionId);

        var bundle = BuildSut(userId);

        await bundle.Uow.BeginTransactionAsync(CancellationToken.None);
        var res = await bundle.Sut.Handle(new FinalizeWizardCommand(sessionId, userId), CancellationToken.None);

        if (res.IsSuccess) await bundle.Uow.CommitAsync(CancellationToken.None);
        else await bundle.Uow.RollbackAsync(CancellationToken.None);

        res.IsSuccess.Should().BeTrue(res.IsFailure ? $"{res.Error.Code} - {res.Error.Description}" : "");

        await using var conn = new MySqlConnection(_db.ConnectionString);

        (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Budget;")).Should().Be(1);
        (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Income;")).Should().Be(1);

        var expenseNames = (await conn.QueryAsync<string>("SELECT Name FROM ExpenseItem;")).ToList();
        expenseNames.Should().NotBeEmpty();
        expenseNames.Should().Contain(n => n.Contains("Rent", StringComparison.OrdinalIgnoreCase));
        expenseNames.Should().Contain(n =>
            n.Contains("Netflix", StringComparison.OrdinalIgnoreCase) ||
            n.Contains("spotify", StringComparison.OrdinalIgnoreCase) ||
            n.Contains("Extra Cloud", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Given_ProcessorFailure_When_Finalize_Then_Rollback_All_Writes()
    {
        await _db.ResetAsync();

        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await DbSeeds.SeedDefaultExpenseCategoriesAsync(_db.ConnectionString);
        await UserTestSeeds.SeedUserAsync(_db.ConnectionString, userId);

        await WizardSeeds.SeedSessionAsync(_db.ConnectionString, sessionId, userId);
        await WizardSeeds.SeedIncomeAndBrokenExpenditureAsync(_db.ConnectionString, sessionId);

        var bundle = BuildSut(userId);

        await bundle.Uow.BeginTransactionAsync(CancellationToken.None);
        var res = await bundle.Sut.Handle(new FinalizeWizardCommand(sessionId, userId), CancellationToken.None);

        if (res.IsSuccess) await bundle.Uow.CommitAsync(CancellationToken.None);
        else await bundle.Uow.RollbackAsync(CancellationToken.None);

        res.IsSuccess.Should().BeFalse("broken JSON in step 2 must fail finalization");

        await using var conn = new MySqlConnection(_db.ConnectionString);

        (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Budget;")).Should().Be(0);
        (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Income;")).Should().Be(0);
        (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM ExpenseItem;")).Should().Be(0);
    }

    [Fact]
    public async Task Given_CleanupFails_When_Finalize_Then_Still_Commits_Budget_And_Leaves_Session()
    {
        await _db.ResetAsync();

        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await DbSeeds.SeedDefaultExpenseCategoriesAsync(_db.ConnectionString);
        await UserTestSeeds.SeedUserAsync(_db.ConnectionString, userId);

        await WizardSeeds.SeedSessionAsync(_db.ConnectionString, sessionId, userId);
        await WizardSeeds.SeedIncomeAndExpenditureAsync(_db.ConnectionString, sessionId);

        var bundle = BuildSut(userId, simulateDeleteFailure: true);

        await bundle.Uow.BeginTransactionAsync(CancellationToken.None);
        var res = await bundle.Sut.Handle(new FinalizeWizardCommand(sessionId, userId), CancellationToken.None);

        if (res.IsSuccess) await bundle.Uow.CommitAsync(CancellationToken.None);
        else await bundle.Uow.RollbackAsync(CancellationToken.None);

        res.IsSuccess.Should().BeTrue("finalization should succeed even if cleanup fails");

        await using var conn = new MySqlConnection(_db.ConnectionString);

        (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Budget;")).Should().Be(1);

        // Session should still exist because DeleteSessionAsync returns false
        (await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM WizardSession WHERE WizardSessionId = @sid;",
            new { sid = sessionId }))
            .Should().Be(1);
    }
}
