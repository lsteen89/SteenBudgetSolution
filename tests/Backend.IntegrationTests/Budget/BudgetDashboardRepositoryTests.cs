using System;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Xunit;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Persistence.Repositories;
using Backend.Settings;
using Backend.IntegrationTests.Shared;

namespace Backend.IntegrationTests.Budget;

[Collection("it:db")]
public sealed class BudgetDashboardRepositoryTests
{
    private readonly MariaDbFixture _db;

    public BudgetDashboardRepositoryTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs });

    [Fact]
    public async Task GetDashboardAsync_WhenBudgetExists_AggregatesDataCorrectly()
    {
        // Arrange
        await _db.ResetAsync();
        var userId = Guid.NewGuid();
        var budgetId = Guid.NewGuid();

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            // Seed user
            await conn.ExecuteAsync("""
                INSERT INTO Users (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
                VALUES (@pid, 'Dash', 'User', 'dash@example.com', 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');
            """, new { pid = userId });

            // Seed budget
            await conn.ExecuteAsync("""
                INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedAt, CreatedByUserId)
                VALUES (@bid, @pid, 'snowball', UTC_TIMESTAMP(), @pid);
            """, new { bid = budgetId, pid = userId });

            // Seed categories (if not already seeded by migrations)
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

            // Savings: 2 500 / month, one goal
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

            // Debts: 10 000 + 5 000 -> total 15 000
            await conn.ExecuteAsync("""
                INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, CreatedAt, CreatedByUserId)
                VALUES
                (UUID_TO_BIN(UUID()), @bid, 'Credit Card', 'revolving', 10000, 18.0, UTC_TIMESTAMP(), @pid),
                (UUID_TO_BIN(UUID()), @bid, 'CSN', 'installment', 5000, 0.5, UTC_TIMESTAMP(), @pid);
            """, new { bid = budgetId, pid = userId });
        }

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        // Act
        var dto = await repo.GetDashboardAsync(userId, default);

        // Assert
        dto.Should().NotBeNull();
        dto!.BudgetId.Should().Be(budgetId);

        dto.Income.TotalIncomeMonthly.Should().Be(30000m + 2000m);
        dto.Expenditure.TotalExpensesMonthly.Should().Be(9000m + 2500m + 500m);
        dto.Savings!.MonthlySavings.Should().Be(2500m);
        dto.Debt.TotalDebtBalance.Should().Be(10000m + 5000m);

        dto.DisposableAfterExpenses.Should().Be(32000m - 12000m); // 20000
        dto.DisposableAfterExpensesAndSavings.Should().Be(32000m - 12000m - 2500m); // 17500

        dto.Expenditure.ByCategory.Should().HaveCount(2);
        dto.Expenditure.ByCategory.Should().Contain(x => x.CategoryName == "Rent" && x.TotalMonthlyAmount == 9000m);
        dto.Expenditure.ByCategory.Should().Contain(x => x.CategoryName == "Food" && x.TotalMonthlyAmount == 3000m);

        dto.Debt.Debts.Should().HaveCount(2);
        dto.Savings.Goals.Should().HaveCount(1);
        dto.Savings.Goals[0].Name.Should().Be("Emergency fund");
    }
}
