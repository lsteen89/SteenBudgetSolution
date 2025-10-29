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
using System.Text.Json;
using System.Text.Json.Serialization;

using Backend.IntegrationTests.Shared;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Wizard.FinalizeWizard;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors;
using Backend.Application.Mappings.Budget;
using Backend.Domain.Shared;
using Backend.Application.Models.Wizard;
// Real repos
using Backend.Infrastructure.Repositories.Budget;
using Backend.Settings;
using Backend.Domain.Abstractions;
// Domain entities used by repos/processors
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Entities.Budget.Income;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Enums;
using Backend.Common.Utilities; // For JsonHelper with enum string converter
// Repo interfaces
using IIncomeRepository = Backend.Application.Abstractions.Infrastructure.Data.IIncomeRepository;
using IExpenditureRepository = Backend.Application.Abstractions.Infrastructure.Data.IExpenditureRepository;
using Backend.Application.DTO.Wizard;

// DTOs
using IncomeDataDto = Backend.Application.DTO.Budget.Income.IncomeData;
using ExpenditureDataDto = Backend.Application.DTO.Budget.Expenditure.ExpenditureData;
using RentDto = Backend.Application.DTO.Budget.Expenditure.RentDto;
using FoodDto = Backend.Application.DTO.Budget.Expenditure.FoodDto;
using TransportDto = Backend.Application.DTO.Budget.Expenditure.TransportDto;
using ClothingDto = Backend.Application.DTO.Budget.Expenditure.ClothingDto;
using FixedExpensesDto = Backend.Application.DTO.Budget.Expenditure.FixedExpensesDto;
using CustomExpenseDto = Backend.Application.DTO.Budget.Expenditure.CustomExpenseDto;
using SubscriptionsDto = Backend.Application.DTO.Budget.Expenditure.SubscriptionsDto;
using SubscriptionDto = Backend.Application.DTO.Budget.Expenditure.SubscriptionDto;

namespace Backend.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class FinalizeWizardFlowTests
{
    private readonly MariaDbFixture _db;
    public FinalizeWizardFlowTests(MariaDbFixture db) => _db = db;

    private sealed class TestCurrentUserContext : ICurrentUserContext
    {
        public Guid Persoid { get; set; }
        public string UserName { get; } = string.Empty; // Email as of now
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

    [Fact]
    public async Task Given_ValidSteps_When_Finalize_Then_Commits_And_Writes_All()
    {
        await _db.ResetAsync();
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        // ----- helpers -----
        static string J(object o) => JsonSerializer.Serialize(
            o,
            new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            });


        var incomePayload = new
        {
            income = new
            {
                netSalary = 30000m,
                salaryFrequency = 0,
                showHouseholdMembers = false,
                showSideIncome = false,
                sideHustles = Array.Empty<object>(),        // no typed list
                householdMembers = Array.Empty<object>()    // no typed list
            }
        };

        var expenditurePayload = new
        {
            expenditure = new
            {
                rent = new { monthlyRent = 900m },
                food = new { foodStoreExpenses = 200m, takeoutExpenses = 50m },
                transport = new { monthlyTransitCost = 600m },
                clothing = new { monthlyClothingCost = 100m },
                utilities = new { electricity = 300m, water = 0m },
                fixedExpenses = new
                {
                    internet = 300m,
                    phone = 200m,
                    unionFees = 0m,
                    customExpenses = new[] { new { id = "fx1", name = "Garbage fee", cost = 75m } }
                },
                subscriptions = new
                {
                    netflix = 149m,
                    customSubscriptions = new[] { new { id = "sub1", name = "Extra Cloud", cost = 29m } }
                }
            }
        };
        var expJson = J(new ExpenditureDataDto
        {
            Rent = new RentDto { MonthlyRent = 900m },
            Food = new FoodDto { FoodStoreExpenses = 200m, TakeoutExpenses = 50m },
            Transport = new TransportDto { MonthlyTransitCost = 600m },
            Clothing = new ClothingDto { MonthlyClothingCost = 100m },

            // This is the only place where your “fixed” bills should go
            FixedExpenses = new FixedExpensesDto
            {
                Electricity = 300m,
                Insurance = 120m,
                Internet = 300m,
                Phone = 200m,
                UnionFees = 0m,
                CustomExpenses = new List<CustomExpenseDto> {
                    new() { Name = "Garbage fee", Cost = 75m },
                    new() { Name = "Parking",     Cost = 250m }
                }
            },

            // Subscriptions MUST be list-based
            Subscriptions = new SubscriptionsDto
            {
                Subscriptions = new List<SubscriptionDto> {
            new() { Name = "Netflix",     Cost = 149m },
            new() { Name = "Extra Cloud", Cost =  29m }
            }
            }
        });
        var incomeJson = J(new IncomeDataDto
        {
            NetSalary = 30000m,
            SalaryFrequency = Frequency.Monthly, // use explicit enum for string serialization
            ShowHouseholdMembers = false,
            ShowSideIncome = false,
            SideHustles = new(),          // keep non-null
            HouseholdMembers = new()
        });
        // Re-serialize using JsonHelper.Camel to ensure enums are written as strings ("monthly")
        incomeJson = JsonSerializer.Serialize(JsonSerializer.Deserialize<IncomeDataDto>(incomeJson)!, JsonHelper.Camel);
        // ----- seed Users -----
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.ExecuteAsync("""
                INSERT INTO Users (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
                VALUES (@pid, 'Final', 'User', 'final@example.com', 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');
            """, new { pid = userId });
        }

        // ----- seed WizardSession + WizardStepData (Step 1 = Income, Step 2 = Expenditure) -----
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            await conn.ExecuteAsync("""
                INSERT INTO WizardSession (WizardSessionId, Persoid, CreatedAt, UpdatedAt)
                VALUES (@sid, @pid, UTC_TIMESTAMP(), UTC_TIMESTAMP());
            """, new { sid = sessionId, pid = userId });

            await conn.ExecuteAsync("""
                INSERT INTO WizardStepData
                    (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
                VALUES
                    (@sid, 1, 0, @income, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
                    (@sid, 2, 0, @exp,    1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
            """, new { sid = sessionId, income = incomeJson, exp = expJson });
        }

        // ----- seed categories (if not preseeded by migration in test db) -----
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.ExecuteAsync("""
            INSERT IGNORE INTO ExpenseCategory (Id, Name) VALUES
            (UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21','-','')), 'Rent'),
            (UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Food'),
            (UNHEX(REPLACE('5eb2896c-59f9-4a18-8c84-4c2a1659de80','-','')), 'Transport'),
            (UNHEX(REPLACE('e47e5c5d-4c97-4d87-89aa-e7a86b8f5ac0','-','')), 'Clothing'),
            (UNHEX(REPLACE('8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900','-','')), 'FixedExpense'),
            (UNHEX(REPLACE('9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4','-','')), 'Subscription'),
            (UNHEX(REPLACE('f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2','-','')), 'Other');
            """);
        }

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var currentUser = new TestCurrentUserContext { Persoid = userId };

        var incomeRepoReal = new IncomeRepository(uow, NullLogger<IncomeRepository>.Instance, currentUser, dbOpts);
        var expRepoReal = new ExpenditureRepository(uow, NullLogger<ExpenditureRepository>.Instance, currentUser, dbOpts);

        var incomeRepo = new BudgetEnsuringIncomeRepo(incomeRepoReal, uow, userId);
        var expRepo = new BudgetEnsuringExpenditureRepo(expRepoReal, uow, userId);

        var budgetRepo = new BudgetRepository(uow, NullLogger<BudgetRepository>.Instance, currentUser, dbOpts);

        var incomeProc = new IncomeStepProcessor(incomeRepo, NullLogger<IncomeStepProcessor>.Instance);
        var expenseProc = new ExpenseStepProcessor(expRepo, NullLogger<ExpenseStepProcessor>.Instance);

        var wizardRepo = new SqlWizardFinalizationRepo(_db.ConnectionString);

        var sut = new FinalizeWizardCommandHandler(
            wizardRepo,
            budgetRepo,
            new IWizardStepProcessor[] { incomeProc, expenseProc },
            NullLogger<FinalizeWizardCommandHandler>.Instance
        );

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await sut.Handle(new FinalizeWizardCommand(sessionId, userId), CancellationToken.None);
        if (!res.IsSuccess) throw new Xunit.Sdk.XunitException($"Finalize failed: {res.Error.Code} - {res.Error.Description}");

        await uow.CommitAsync(CancellationToken.None);

        // ---- Asserts ----
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Budget;")).Should().Be(1);
            (await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM Income;")).Should().Be(1);

            var items = await conn.QueryAsync<(Guid CategoryId, string Name, decimal Amount)>(
                "SELECT CategoryId, Name, AmountMonthly AS Amount FROM ExpenseItem;"
            );
            items.Should().NotBeEmpty();
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

            // Ensure WizardSession exists for FK integrity before inserting step data rows
            await conn.ExecuteAsync("""
                INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
                VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
            """, new { sid = sessionId, pid = userId });

            // Step 1 OK, Step 2 BROKEN JSON to force processor failure
            await conn.ExecuteAsync("""
                INSERT INTO WizardStepData (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
                VALUES
                (@sid, 1, 0, @income, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
                (@sid, 2, 0, @expBroken, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
            """, new
            {
                sid = sessionId,
                // Use string enum value (camelCase) to pass step 1 deserialization; step 2 remains broken
                income = """
                         {"netSalary":30000,"salaryFrequency":"monthly","showHouseholdMembers":false,"showSideIncome":false,
                          "sideHustles":[],"householdMembers":[]}
                         """,
                expBroken = "{ this is not valid json"
            });
        }

        var dbOpts = DbOptions(_db.ConnectionString);

        var uow = new UnitOfWork(DbOptions(_db.ConnectionString), NullLogger<UnitOfWork>.Instance);
        var currentUser = new TestCurrentUserContext { Persoid = userId };

        var incomeRepoReal = new IncomeRepository(uow, NullLogger<IncomeRepository>.Instance, currentUser, dbOpts);
        var expRepoReal = new ExpenditureRepository(uow, NullLogger<ExpenditureRepository>.Instance, currentUser, dbOpts);

        // Budget repo
        var budgetRepo = new BudgetRepository(uow, NullLogger<BudgetRepository>.Instance, currentUser, dbOpts);

        var incomeRepo = new BudgetEnsuringIncomeRepo(incomeRepoReal, uow, userId);
        var expRepo = new BudgetEnsuringExpenditureRepo(expRepoReal, uow, userId);

        var incomeProc = new IncomeStepProcessor(incomeRepo, NullLogger<IncomeStepProcessor>.Instance);
        var expenseProc = new ExpenseStepProcessor(expRepo, NullLogger<ExpenseStepProcessor>.Instance);

        var wizardRepo = new SqlWizardFinalizationRepo(_db.ConnectionString);

        var sut = new FinalizeWizardCommandHandler(
            wizardRepo,
            budgetRepo,
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
