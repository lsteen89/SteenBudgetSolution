using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Services.Debts;
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



        var creditCardPayment = ComputeDebtPayment(
            type: "revolving", balance: 10000m, apr: 18m,
            monthlyFee: 20m, minPayment: 300m, termMonths: null);
        var csnPayment = ComputeDebtPayment(
            type: "installment", balance: 5000m, apr: 0.5m,
            monthlyFee: 10m, minPayment: null, termMonths: 24);

        await conn.ExecuteAsync("""
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, MonthlyPayment, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, 'Credit Card', 'revolving',    10000, 18.0, 20, 300, NULL, @ccPayment, UTC_TIMESTAMP(), @pid),
            (UUID_TO_BIN(UUID()), @bid, 'CSN',         'installment',   5000,  0.5, 10, NULL, 24,  @csnPayment, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid, ccPayment = creditCardPayment, csnPayment = csnPayment });

        var oldClosedPayment = ComputeDebtPayment(
            type: "installment", balance: 9999m, apr: 1.0m,
            monthlyFee: 0m, minPayment: null, termMonths: 12);

        // Debt PR 1: legacy `closed` lifecycle now maps to `paidOff`. The
        // semantics are identical for current consumers — paid-off rows are
        // skipped by materialization (Debt.Status filter), and the editor's
        // existing tests assert this row never appears as an active month row.
        await conn.ExecuteAsync("""
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, MonthlyPayment, Status, ClosedAt, PaidOffAt, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, 'Old Closed Debt', 'installment', 9999, 1.0, 0, NULL, 12, @payment, 'paidOff', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, pid = persoid, payment = oldClosedPayment });

        return (Persoid: persoid, UserId: userId, BudgetId: budgetId);
    }

    private static readonly IDebtPaymentCalculator DebtCalculator = new DebtPaymentCalculator();

    private static decimal ComputeDebtPayment(
        string type, decimal balance, decimal apr,
        decimal? monthlyFee, decimal? minPayment, int? termMonths)
        => DebtCalculator.CalculateMonthlyPayment(
            new DebtSeedPaymentInput(type, balance, apr, minPayment, monthlyFee, termMonths));

    private sealed record DebtSeedPaymentInput(
        string Type, decimal Balance, decimal Apr,
        decimal? MinPayment, decimal? MonthlyFee, int? TermMonths) : IDebtPaymentInput;
}
