using System;
using System.Linq;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Services.Debts;
using Dapper;
using MySqlConnector;

namespace Backend.IntegrationTests.Shared.Seeds;

public enum BudgetSeedScenario
{
    Minimal = 0,
    WithData = 1
}

public readonly record struct SeedResult(Guid Persoid, Guid UserId, Guid BudgetId);

internal static class DbSeeds
{
    // Reference IDs are deterministic (good). Keep them in one place.
    private static readonly (string Id, string Name)[] DefaultExpenseCategories =
    [
        ("2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21", "Housing"),
        ("5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10", "Food"),
        ("5eb2896c-59f9-4a18-8c84-4c2a1659de80", "Transport"),
        ("e47e5c5d-4c97-4d87-89aa-e7a86b8f5ac0", "Clothing"),
        ("8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900", "FixedExpense"),
        ("9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4", "Subscription"),
        ("f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2", "Other"),
    ];

    public static async Task SeedDefaultExpenseCategoriesAsync(string cs)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();
        await EnsureDefaultExpenseCategoriesAsync(conn);
    }

    public static Task EnsureDefaultExpenseCategoriesAsync(MySqlConnection conn, MySqlTransaction? tx = null)
    {
        const string sql = """
            INSERT IGNORE INTO ExpenseCategory (Id, Name)
            VALUES (UNHEX(REPLACE(@Id,'-','')), @Name);
        """;

        return conn.ExecuteAsync(sql, DefaultExpenseCategories.Select(x => new { x.Id, x.Name }), tx);
    }

    public static async Task<SeedResult> SeedBudgetAsync(string cs, BudgetSeedScenario scenario)
    {
        var persoid = Guid.NewGuid();
        var userId = persoid; // your system uses Persoid as user id
        var budgetId = Guid.NewGuid();

        // Avoid collisions if Email is UNIQUE.
        var email = $"month+{persoid:N}@example.com";

        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        // Optional: wrap in transaction if you like atomic seeds
        // await using var tx = await conn.BeginTransactionAsync();

        await InsertUserAsync(conn, persoid, email /*, tx */);
        await InsertBudgetAsync(conn, budgetId, persoid /*, tx */);

        if (scenario == BudgetSeedScenario.Minimal)
        {
            // await tx.CommitAsync();
            return new SeedResult(persoid, userId, budgetId);
        }

        // WithData
        await EnsureDefaultExpenseCategoriesAsync(conn /*, tx */);

        await InsertBudgetDataAsync(conn, budgetId, persoid /*, tx */);

        // await tx.CommitAsync();
        return new SeedResult(persoid, userId, budgetId);
    }

    private static Task InsertUserAsync(MySqlConnection conn, Guid persoid, string email /*, MySqlTransaction tx */)
    {
        const string sql = """
            INSERT INTO Users (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES (
                UNHEX(REPLACE(@pid,'-','')),
                'Month', 'User',
                @email,
                1,
                '$2a$12$abcdefghijkABCDEFGHIJKlmn',
                'User',
                0,
                0,
                'it'
            );
        """;

        return conn.ExecuteAsync(sql, new { pid = persoid.ToString(), email } /*, tx */);
    }

    private static Task InsertBudgetAsync(MySqlConnection conn, Guid budgetId, Guid persoid /*, MySqlTransaction tx */)
    {
        const string sql = """
            INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedAt, CreatedByUserId)
            VALUES (
                UNHEX(REPLACE(@bid,'-','')),
                UNHEX(REPLACE(@pid,'-','')),
                'snowball',
                UTC_TIMESTAMP(),
                UNHEX(REPLACE(@pid,'-',''))
            );
        """;

        return conn.ExecuteAsync(sql, new { bid = budgetId.ToString(), pid = persoid.ToString() } /*, tx */);
    }

    private static async Task InsertBudgetDataAsync(MySqlConnection conn, Guid budgetId, Guid persoid /*, MySqlTransaction tx */)
    {
        var incomeId = Guid.NewGuid();
        var savingsId = Guid.NewGuid();

        // Income
        await conn.ExecuteAsync("""
            INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency, CreatedAt, CreatedByUserId)
            VALUES (
                UNHEX(REPLACE(@iid,'-','')),
                UNHEX(REPLACE(@bid,'-','')),
                30000,
                0,
                UTC_TIMESTAMP(),
                UNHEX(REPLACE(@pid,'-',''))
            );
        """, new
        {
            iid = incomeId.ToString(),
            bid = budgetId.ToString(),
            pid = persoid.ToString()
        } /*, tx */);

        // Side hustle + household member (no SELECT/LIMIT hacks)
        await conn.ExecuteAsync("""
            INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedAt, CreatedByUserId)
            VALUES (
                UUID_TO_BIN(UUID()),
                UNHEX(REPLACE(@iid,'-','')),
                'Side job',
                2000,
                0,
                UTC_TIMESTAMP(),
                UNHEX(REPLACE(@pid,'-',''))
            );
        """, new { iid = incomeId.ToString(), pid = persoid.ToString() } /*, tx */);

        await conn.ExecuteAsync("""
            INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedAt, CreatedByUserId)
            VALUES (
                UUID_TO_BIN(UUID()),
                UNHEX(REPLACE(@iid,'-','')),
                'Partner contribution',
                500,
                0,
                UTC_TIMESTAMP(),
                UNHEX(REPLACE(@pid,'-',''))
            );
        """, new { iid = incomeId.ToString(), pid = persoid.ToString() } /*, tx */);

        // Expense items (use your deterministic category ids)
        await conn.ExecuteAsync("""
            INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), UNHEX(REPLACE(@bid,'-','')), UNHEX(REPLACE('2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21','-','')), 'Rent',      9000, UTC_TIMESTAMP(), UNHEX(REPLACE(@pid,'-',''))),
            (UUID_TO_BIN(UUID()), UNHEX(REPLACE(@bid,'-','')), UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Groceries',  2500, UTC_TIMESTAMP(), UNHEX(REPLACE(@pid,'-',''))),
            (UUID_TO_BIN(UUID()), UNHEX(REPLACE(@bid,'-','')), UNHEX(REPLACE('5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10','-','')), 'Takeout',     500, UTC_TIMESTAMP(), UNHEX(REPLACE(@pid,'-','')));
        """, new { bid = budgetId.ToString(), pid = persoid.ToString() } /*, tx */);

        // Savings
        await conn.ExecuteAsync("""
            INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedAt, CreatedByUserId)
            VALUES (
                UNHEX(REPLACE(@sid,'-','')),
                UNHEX(REPLACE(@bid,'-','')),
                2500,
                UTC_TIMESTAMP(),
                UNHEX(REPLACE(@pid,'-',''))
            );
        """, new
        {
            sid = savingsId.ToString(),
            bid = budgetId.ToString(),
            pid = persoid.ToString()
        } /*, tx */);
        // Normal goal -> should yield MonthlyContribution > 0
        await conn.ExecuteAsync("""
            INSERT INTO SavingsGoal
            (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, MonthlyContribution, CreatedAt, CreatedByUserId)
            SELECT
                UUID_TO_BIN(UUID()),
                s.Id,
                'Emergency fund',
                50000,
                '2026-12-31',
                10000,
                1500,
                UTC_TIMESTAMP(),
                @pid
            FROM Savings s
            WHERE s.BudgetId = @bid
            LIMIT 1;
        """, new { bid = budgetId, pid = persoid });

        // Completed goal -> should yield MonthlyContribution = 0 (if ComputeMonthlyContribution is sane)
        await conn.ExecuteAsync("""
            INSERT INTO SavingsGoal
            (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, CreatedAt, CreatedByUserId)
            SELECT
                UUID_TO_BIN(UUID()),
                s.Id,
                'Already done',
                20000,
                '2026-06-30',
                20000,
                UTC_TIMESTAMP(),
                @pid
            FROM Savings s
            WHERE s.BudgetId = @bid
            LIMIT 1;
        """, new { bid = budgetId, pid = persoid });

        // Debts. MonthlyPayment is the authoritative planned payment column;
        // seed it with the calculator output so dashboard / recap / totals
        // tests see the same numbers they would have computed on the fly
        // under the old (calculator-driven) read path.
        var creditCardPayment = ComputeDebtPayment(
            type: "revolving", balance: 10000m, apr: 18m,
            monthlyFee: 20m, minPayment: 300m, termMonths: null);
        var csnPayment = ComputeDebtPayment(
            type: "installment", balance: 5000m, apr: 0.5m,
            monthlyFee: 10m, minPayment: null, termMonths: 24);

        await conn.ExecuteAsync("""
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, MonthlyPayment, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), UNHEX(REPLACE(@bid,'-','')), 'Credit Card', 'revolving',  10000, 18.0, 20, 300, NULL, @ccPayment, UTC_TIMESTAMP(), UNHEX(REPLACE(@pid,'-',''))),
            (UUID_TO_BIN(UUID()), UNHEX(REPLACE(@bid,'-','')), 'CSN',         'installment', 5000,  0.5, 10, NULL, 24,  @csnPayment, UTC_TIMESTAMP(), UNHEX(REPLACE(@pid,'-','')));
        """, new
        {
            bid = budgetId.ToString(),
            pid = persoid.ToString(),
            ccPayment = creditCardPayment,
            csnPayment = csnPayment
        } /*, tx */);

        // Debt PR 1: legacy `closed` lifecycle now maps to `paidOff`. Non-active
        // sources are skipped by materialization and dashboard reads, so this
        // row's MonthlyPayment is functionally irrelevant; seeded for schema
        // consistency only.
        var oldClosedPayment = ComputeDebtPayment(
            type: "installment", balance: 9999m, apr: 1.0m,
            monthlyFee: 0m, minPayment: null, termMonths: 12);

        await conn.ExecuteAsync("""
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, MonthlyPayment, Status, ClosedAt, PaidOffAt, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), UNHEX(REPLACE(@bid,'-','')), 'Old Closed Debt', 'installment', 9999, 1.0, 0, NULL, 12, @payment, 'paidOff', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP(), UNHEX(REPLACE(@pid,'-','')));
        """, new
        {
            bid = budgetId.ToString(),
            pid = persoid.ToString(),
            payment = oldClosedPayment
        } /*, tx */);
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
