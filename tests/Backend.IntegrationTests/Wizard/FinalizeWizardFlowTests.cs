using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.IntegrationTests.Shared;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Wizard.FinalizeWizard;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors;
using Backend.Application.Mappings.Budget;
using Backend.Domain.Shared;

// Real repos
using Backend.Infrastructure.Repositories.Budget;
using Backend.Settings;
using Backend.Domain.Abstractions;
// Domain entities used by repos/processors
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Entities.Budget.Income;
using Backend.Domain.Entities.Budget.Expenses;
// Repo interfaces
using IIncomeRepository = Backend.Application.Abstractions.Infrastructure.Data.IIncomeRepository;
using IExpenditureRepository = Backend.Application.Abstractions.Infrastructure.Data.IExpenditureRepository;
using Backend.Application.DTO.Wizard;

namespace Backend.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class FinalizeWizardFlowTests
{
    private readonly MariaDbFixture _db;
    public FinalizeWizardFlowTests(MariaDbFixture db) => _db = db;

    private sealed class TestCurrentUserContext : ICurrentUserContext
    {
        public Guid Persoid { get; set; }
        public string UserName { get; } // Email as of now
    }

    // ---------- Decorators that ensure Budget exists before first write ----------
    private sealed class BudgetEnsuringIncomeRepo : IIncomeRepository
    {
        private readonly IIncomeRepository _inner;
        private readonly IUnitOfWork _uow;
        private readonly Guid _userId;

        public BudgetEnsuringIncomeRepo(IIncomeRepository inner, IUnitOfWork uow, Guid userId)
        {
            _inner = inner; _uow = uow; _userId = userId;
        }

        public async Task AddAsync(Income income, Guid budgetId, CancellationToken ct)
        {
            await EnsureBudgetAsync(budgetId, ct);
            await _inner.AddAsync(income, budgetId, ct);
        }

        private async Task EnsureBudgetAsync(Guid budgetId, CancellationToken ct)
        {
            var exists = await _uow.Connection!.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM Budget WHERE Id=@id;", new { id = budgetId }, _uow.Transaction);
            if (exists == 0)
            {
                await _uow.Connection!.ExecuteAsync("""
                    INSERT INTO Budget (Id, Persoid, CreatedByUserId)
                    VALUES (@id, @pid, @uid);
                """, new { id = budgetId, pid = _userId, uid = _userId }, _uow.Transaction);
            }
        }
    }

    private sealed class BudgetEnsuringExpenditureRepo : IExpenditureRepository
    {
        private readonly IExpenditureRepository _inner;
        private readonly IUnitOfWork _uow;
        private readonly Guid _userId;

        public BudgetEnsuringExpenditureRepo(IExpenditureRepository inner, IUnitOfWork uow, Guid userId)
        {
            _inner = inner; _uow = uow; _userId = userId;
        }

        public async Task AddAsync(Expense expense, Guid budgetId, CancellationToken ct)
        {
            await EnsureBudgetAsync(budgetId, ct);
            await _inner.AddAsync(expense, budgetId, ct);
        }

        private async Task EnsureBudgetAsync(Guid budgetId, CancellationToken ct)
        {
            var exists = await _uow.Connection!.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM Budget WHERE Id=@id;", new { id = budgetId }, _uow.Transaction);
            if (exists == 0)
            {
                await _uow.Connection!.ExecuteAsync("""
                    INSERT INTO Budget (Id, Persoid, CreatedByUserId)
                    VALUES (@id, @pid, @uid);
                """, new { id = budgetId, pid = _userId, uid = _userId }, _uow.Transaction);
            }
        }
    }

    // You can add Savings/Debts decorators the same way if you include processors 3/4.

    // ---------- Wizard repo stub wired to the DB just for finalization read ----------
    private sealed class SqlWizardFinalizationRepo : IWizardRepository
    {
        private readonly string _cs;
        public SqlWizardFinalizationRepo(string cs) => _cs = cs;

        public Task<Guid?> GetSessionIdByPersoIdAsync(Guid persoId, CancellationToken ct) => Task.FromResult<Guid?>(null);
        public Task<Guid> CreateSessionAsync(Guid persoId, CancellationToken ct) => Task.FromResult(Guid.Empty);
        public Task<bool> UpsertStepDataAsync(Guid wizardSessionId, int stepNumber, int substepNumber, string jsonData, int dataVersion, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> DoesUserOwnSessionAsync(Guid userId, Guid sessionId, CancellationToken ct) => Task.FromResult(false);
        public Task<WizardSavedDataDTO?> GetWizardDataAsync(Guid sessionId, CancellationToken ct) => Task.FromResult<WizardSavedDataDTO?>(null);

        public async Task<IEnumerable<WizardStepRowEntity>> GetRawStepDataForFinalizationAsync(Guid sessionId, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.QueryAsync<WizardStepRowEntity>(@"
                SELECT WizardSessionId, StepNumber, SubStep, StepData, DataVersion, UpdatedAt
                FROM WizardStepData
                WHERE WizardSessionId = @sid;", new { sid = sessionId });
        }
    }

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs });

    // ------------------------------------------------------------
    // SUCCESS: income + expenditure succeed => COMMIT
    // ------------------------------------------------------------
    [Fact]
    public async Task Given_ValidSteps_When_Finalize_Then_Commits_And_Writes_All()
    {
        await _db.ResetAsync();
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        // Seed a user for CreatedByUserId and Budget.Persoid
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.ExecuteAsync("""
                INSERT INTO Users (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
                VALUES (@pid, 'Final', 'User', 'final@example.com', 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');
            """, new { pid = userId });
        }

        // Seed WizardStepData rows (Step 1 & 2)
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.ExecuteAsync("""
                INSERT INTO WizardStepData (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
                VALUES
                (@sid, 1, 0, @income, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
                (@sid, 2, 0, @exp,    1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
            """, new
            {
                sid = sessionId,
                income = /* IncomeData (minimal valid) */ """
                          {"netSalary":30000,"salaryFrequency":0,"showHouseholdMembers":false,"showSideIncome":false,
                           "sideHustles":[],"householdMembers":[]}
                          """,
                exp = /* ExpenditureData (mapper-friendly) */ """
                       {"rent":{"monthlyRent":900},
                        "food":{"foodStoreExpenses":200,"takeoutExpenses":50},
                        "transport":{"monthlyTransitCost":600},
                        "clothing":{"monthlyClothingCost":100},
                        "fixedExpenses":{"electricity":300,"internet":300,"phone":200,"unionFees":0,"customExpenses":[]},
                        "subscriptions":{"subscriptions":[{"name":"Netflix","cost":149}]}}
                       """
            });
        }

        var uow = new UnitOfWork(DbOptions(_db.ConnectionString), NullLogger<UnitOfWork>.Instance);
        var currentUser = new TestCurrentUserContext { Persoid = userId };

        // real repos
        var incomeRepoReal = new IncomeRepository(uow, NullLogger<IncomeRepository>.Instance, currentUser);
        var expRepoReal = new ExpenditureRepository(uow, NullLogger<ExpenditureRepository>.Instance, currentUser);

        // wrap with budget ensuring
        var incomeRepo = new BudgetEnsuringIncomeRepo(incomeRepoReal, uow, userId);
        var expRepo = new BudgetEnsuringExpenditureRepo(expRepoReal, uow, userId);

        // processors
        var incomeProc = new IncomeStepProcessor(incomeRepo, NullLogger<IncomeStepProcessor>.Instance);
        var expenseProc = new ExpenseStepProcessor(expRepo, NullLogger<ExpenseStepProcessor>.Instance);

        // wizard repo (read-only SQL)
        var wizardRepo = new SqlWizardFinalizationRepo(_db.ConnectionString);

        var sut = new FinalizeWizardCommandHandler(
            wizardRepo,
            new IWizardStepProcessor[] { incomeProc, expenseProc },
            NullLogger<FinalizeWizardCommandHandler>.Instance
        );

        // begin tx (simulating pipeline)
        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await sut.Handle(new FinalizeWizardCommand(sessionId, userId), CancellationToken.None);

        if (res.IsSuccess) await uow.CommitAsync(CancellationToken.None);
        else await uow.RollbackAsync(CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        // Assert rows committed
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            var budgetCount = await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Budget;");
            budgetCount.Should().Be(1);

            var incomeCount = await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Income;");
            incomeCount.Should().Be(1);

            var items = await conn.QueryAsync<(Guid CategoryId, string Name, decimal Amount)>(
                "SELECT CategoryId, Name, AmountMonthly AS Amount FROM ExpenseItem;");
            items.Should().NotBeEmpty();
            // Quick sanity checks for mapper outputs
            items.Should().Contain(x => x.Name.Contains("Rent", StringComparison.OrdinalIgnoreCase));
            items.Should().Contain(x => x.Name.Contains("Netflix", StringComparison.OrdinalIgnoreCase) || x.CategoryId != Guid.Empty);
        }
    }

    // ------------------------------------------------------------
    // FAILURE: expenditure JSON broken => ROLLBACK everything
    // ------------------------------------------------------------
    [Fact]
    public async Task Given_ProcessorFailure_When_Finalize_Then_Rollback_All_Writes()
    {
        await _db.ResetAsync();
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.ExecuteAsync("""
                INSERT INTO Users (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
                VALUES (@pid, 'Final', 'User', 'final@example.com', 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');
            """, new { pid = userId });

            // Step 1 OK, Step 2 BROKEN JSON to force processor failure
            await conn.ExecuteAsync("""
                INSERT INTO WizardStepData (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
                VALUES
                (@sid, 1, 0, @income, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
                (@sid, 2, 0, @expBroken, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
            """, new
            {
                sid = sessionId,
                income = """
                         {"netSalary":30000,"salaryFrequency":0,"showHouseholdMembers":false,"showSideIncome":false,
                          "sideHustles":[],"householdMembers":[]}
                         """,
                expBroken = "{ this is not valid json"
            });
        }

        var uow = new UnitOfWork(DbOptions(_db.ConnectionString), NullLogger<UnitOfWork>.Instance);
        var currentUser = new TestCurrentUserContext { Persoid = userId };

        var incomeRepoReal = new IncomeRepository(uow, NullLogger<IncomeRepository>.Instance, currentUser);
        var expRepoReal = new ExpenditureRepository(uow, NullLogger<ExpenditureRepository>.Instance, currentUser);

        var incomeRepo = new BudgetEnsuringIncomeRepo(incomeRepoReal, uow, userId);
        var expRepo = new BudgetEnsuringExpenditureRepo(expRepoReal, uow, userId);

        var incomeProc = new IncomeStepProcessor(incomeRepo, NullLogger<IncomeStepProcessor>.Instance);
        var expenseProc = new ExpenseStepProcessor(expRepo, NullLogger<ExpenseStepProcessor>.Instance);

        var wizardRepo = new SqlWizardFinalizationRepo(_db.ConnectionString);

        var sut = new FinalizeWizardCommandHandler(
            wizardRepo,
            new IWizardStepProcessor[] { incomeProc, expenseProc },
            NullLogger<FinalizeWizardCommandHandler>.Instance
        );

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await sut.Handle(new FinalizeWizardCommand(sessionId, userId), CancellationToken.None);

        if (res.IsSuccess) await uow.CommitAsync(CancellationToken.None);
        else await uow.RollbackAsync(CancellationToken.None);

        // Handler must fail on bad JSON in step 2, and our manual rollback should revert step 1 writes.
        res.IsSuccess.Should().BeFalse();

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            // Everything rolled back
            (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Budget;")).Should().Be(0);
            (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Income;")).Should().Be(0);
            (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM ExpenseItem;")).Should().Be(0);
        }
    }
}
