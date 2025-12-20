using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Xunit;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Services.Debts;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.IntegrationTests.Shared;
using Backend.Settings;

namespace Backend.IntegrationTests.Budget;

[Collection("it:db")]
public sealed class BudgetDashboardQueryServiceTests
{
    private readonly MariaDbFixture _db;

    public BudgetDashboardQueryServiceTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    [Fact]
    public async Task GetAsync_WhenBudgetExists_ComputesDisposableAndMonthlyPayments_WithRealCalculator()
    {
        // Arrange
        await _db.ResetAsync();
        var (userId, budgetId) = await SeedAsync(_db.ConnectionString);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        // Real calculator
        IDebtPaymentCalculator calc = new DebtPaymentCalculator();

        var svc = new BudgetDashboardQueryService(repo, calc);

        // Act
        var dto = await svc.GetAsync(userId, CancellationToken.None);

        // Assert (disposable)
        dto.Should().NotBeNull();
        dto!.BudgetId.Should().Be(budgetId);

        dto.Income.TotalIncomeMonthly.Should().Be(32000m);
        dto.Expenditure.TotalExpensesMonthly.Should().Be(12000m);
        dto.Savings!.MonthlySavings.Should().Be(2500m);

        dto.DisposableAfterExpenses.Should().Be(32000m - 12000m);              // 20000
        dto.DisposableAfterExpensesAndSavings.Should().Be(32000m - 12000m - 2500m); // 17500

        // Assert (monthly payments)
        // Revolving: MinPayment(300) + MonthlyFee(20) = 320
        var cc = dto.Debt.Debts.Single(d => d.Name == "Credit Card");
        cc.MonthlyPayment.Should().Be(320m);

        // Installment: amortize(5000, 0.5%, 24) + fee(10)
        var csn = dto.Debt.Debts.Single(d => d.Name == "CSN");
        var expectedInstallment = Amortize(principal: 5000m, annualRatePercent: 0.5m, months: 24) + 10m;
        csn.MonthlyPayment.Should().Be(expectedInstallment);

        dto.Debt.TotalMonthlyPayments.Should().Be(320m + expectedInstallment);
        dto.Debt.TotalDebtBalance.Should().Be(15000m);
    }

    [Fact]
    public async Task GetAsync_UsesInjectedDebtPaymentCalculator_SpyStub()
    {
        // Arrange
        await _db.ResetAsync();
        var (userId, budgetId) = await SeedAsync(_db.ConnectionString);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        var spy = new SpyDebtPaymentCalculator(constant: 123m);
        var svc = new BudgetDashboardQueryService(repo, spy);

        // Act
        var dto = await svc.GetAsync(userId, CancellationToken.None);

        // Assert
        dto.Should().NotBeNull();
        dto!.BudgetId.Should().Be(budgetId);

        // Prove the service called calculator for each debt:
        spy.CallCount.Should().Be(2);

        dto.Debt.Debts.Should().HaveCount(2);
        dto.Debt.Debts.All(d => d.MonthlyPayment == 123m).Should().BeTrue();

        dto.Debt.TotalMonthlyPayments.Should().Be(246m);
        dto.Debt.TotalDebtBalance.Should().Be(15000m); // still from DB totals
    }

    // ---- helpers ----

    private static async Task<(Guid userId, Guid budgetId)> SeedAsync(string cs)
    {
        var userId = Guid.NewGuid();
        var budgetId = Guid.NewGuid();

        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO Users (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES (@pid, 'Dash', 'User', 'dash@example.com', 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');
        """, new { pid = userId });

        await conn.ExecuteAsync("""
            INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedAt, CreatedByUserId)
            VALUES (@bid, @pid, 'snowball', UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = userId });

        await conn.ExecuteAsync("""
            INSERT IGNORE INTO ExpenseCategory (Id, Name) VALUES
            (UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21','-','')), 'Rent'),
            (UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Food');
        """);

        // Income: 30 000 salary + 2 000 side hustle
        await conn.ExecuteAsync("""
            INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency, CreatedAt, CreatedByUserId)
            VALUES (UUID_TO_BIN(UUID()), @bid, 30000, 0, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = userId });

        await conn.ExecuteAsync("""
            INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedAt, CreatedByUserId)
            SELECT UUID_TO_BIN(UUID()), i.Id, 'Side job', 2000, 0, UTC_TIMESTAMP(), @pid
            FROM Income i
            WHERE i.BudgetId = @bid
            LIMIT 1;
        """, new { bid = budgetId, pid = userId });

        // Expenses: Rent 9 000, Food 3 000
        await conn.ExecuteAsync("""
            INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21','-','')), 'Rent', 9000, UTC_TIMESTAMP(), @pid),
            (UUID_TO_BIN(UUID()), @bid, UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Groceries', 2500, UTC_TIMESTAMP(), @pid),
            (UUID_TO_BIN(UUID()), @bid, UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Takeout', 500, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = userId });

        // Savings: 2 500 / month + goal
        await conn.ExecuteAsync("""
            INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedAt, CreatedByUserId)
            VALUES (UUID_TO_BIN(UUID()), @bid, 2500, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = userId });

        await conn.ExecuteAsync("""
            INSERT INTO SavingsGoal (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, CreatedAt, CreatedByUserId)
            SELECT UUID_TO_BIN(UUID()), s.Id, 'Emergency fund', 30000, DATE_ADD(CURDATE(), INTERVAL 12 MONTH), 5000, UTC_TIMESTAMP(), @pid
            FROM Savings s
            WHERE s.BudgetId = @bid
            LIMIT 1;
        """, new { bid = budgetId, pid = userId });

        // Debts (IMPORTANT: seed MonthlyFee/MinPayment/TermMonths so monthly payment is meaningful)
        await conn.ExecuteAsync("""
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, 'Credit Card', 'revolving',    10000, 18.0, 20, 300, NULL, UTC_TIMESTAMP(), @pid),
            (UUID_TO_BIN(UUID()), @bid, 'CSN',         'installment',   5000,  0.5, 10, NULL, 24,   UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = userId });

        return (userId, budgetId);
    }

    private static decimal Amortize(decimal principal, decimal annualRatePercent, int months)
    {
        if (principal <= 0m || months <= 0) return 0m;

        if (annualRatePercent <= 0m)
            return Math.Round(principal / months, 2, MidpointRounding.AwayFromZero);

        var r = (annualRatePercent / 100m) / 12m;
        var denom = 1m - (decimal)Math.Pow((double)(1m + r), -months);
        if (denom == 0m) return 0m;

        return Math.Round(principal * r / denom, 2, MidpointRounding.AwayFromZero);
    }

    private sealed class SpyDebtPaymentCalculator : IDebtPaymentCalculator
    {
        private readonly decimal _constant;
        public int CallCount { get; private set; }

        public SpyDebtPaymentCalculator(decimal constant) => _constant = constant;

        public decimal CalculateMonthlyPayment(Backend.Domain.Entities.Budget.Debt.Debt d)
        {
            CallCount++;
            return _constant;
        }
    }
}
