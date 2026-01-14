using Dapper;
using MySqlConnector;

namespace Backend.IntegrationTests.Shared.Seeds.Budget;

[Obsolete("Use WizardSeeds instead")]
internal static class BudgetSeeds
{
    public static async Task<(Guid Persoid, Guid UserId, Guid BudgetId)> SeedMinimalAsync(string cs)
    {
        var persoid = Guid.NewGuid();
        var userId = persoid;
        var budgetId = Guid.NewGuid();

        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO Users (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES (@pid, 'Month', 'User', 'month@example.com', 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');
        """, new { pid = persoid });

        await conn.ExecuteAsync("""
            INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedAt, CreatedByUserId)
            VALUES (@bid, @pid, 'snowball', UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid });

        return (Persoid: persoid, UserId: userId, BudgetId: budgetId);
    }

    public static async Task<(Guid Persoid, Guid UserId, Guid BudgetId)> SeedWithDataAsync(string cs)
    {
        var persoid = Guid.NewGuid();
        var userId = persoid;
        var budgetId = Guid.NewGuid();

        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO Users (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES (@pid, 'Month', 'User', 'month@example.com', 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');
        """, new { pid = persoid });

        await conn.ExecuteAsync("""
            INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedAt, CreatedByUserId)
            VALUES (@bid, @pid, 'snowball', UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid });

        await conn.ExecuteAsync("""
            INSERT IGNORE INTO ExpenseCategory (Id, Name) VALUES
            (UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21','-','')), 'Rent'),
            (UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Food');
        """);

        await conn.ExecuteAsync("""
            INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency, CreatedAt, CreatedByUserId)
            VALUES (UUID_TO_BIN(UUID()), @bid, 30000, 0, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid });

        await conn.ExecuteAsync("""
            INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedAt, CreatedByUserId)
            SELECT UUID_TO_BIN(UUID()), i.Id, 'Side job', 2000, 0, UTC_TIMESTAMP(), @pid
            FROM Income i
            WHERE i.BudgetId = @bid
            LIMIT 1;
        """, new { bid = budgetId, pid = persoid });

        await conn.ExecuteAsync("""
            INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedAt, CreatedByUserId)
            SELECT UUID_TO_BIN(UUID()), i.Id, 'Partner contribution', 500, 0, UTC_TIMESTAMP(), @pid
            FROM Income i
            WHERE i.BudgetId = @bid
            LIMIT 1;
        """, new { bid = budgetId, pid = persoid });

        await conn.ExecuteAsync("""
            INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21','-','')), 'Rent', 9000, UTC_TIMESTAMP(), @pid),
            (UUID_TO_BIN(UUID()), @bid, UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Groceries', 2500, UTC_TIMESTAMP(), @pid),
            (UUID_TO_BIN(UUID()), @bid, UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Takeout', 500, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid });

        await conn.ExecuteAsync("""
            INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedAt, CreatedByUserId)
            VALUES (UUID_TO_BIN(UUID()), @bid, 2500, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid });



        await conn.ExecuteAsync("""
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, 'Credit Card', 'revolving',    10000, 18.0, 20, 300, NULL, UTC_TIMESTAMP(), @pid),
            (UUID_TO_BIN(UUID()), @bid, 'CSN',         'installment',   5000,  0.5, 10, NULL, 24,   UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid });

        await conn.ExecuteAsync("""
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, Status, ClosedAt, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, 'Old Closed Debt', 'installment', 9999, 1.0, 0, NULL, 12, 'closed', UTC_TIMESTAMP(), UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid });

        return (Persoid: persoid, UserId: userId, BudgetId: budgetId);
    }
}
