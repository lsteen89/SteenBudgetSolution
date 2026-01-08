using System;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace Backend.IntegrationTests.Shared;

internal static class BudgetMonthSeeds
{
    public static async Task SeedOpenMonthAsync(
        string cs,
        Guid budgetId,
        string yearMonth,
        string carryOverMode,
        decimal? carryOverAmount,
        Guid createdByUserId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth (
                Id, BudgetId, YearMonth, Status, OpenedAt,
                CarryOverMode, CarryOverAmount,
                CreatedByUserId
            )
            VALUES (
                UUID_TO_BIN(UUID()), @bid, @ym, 'open', UTC_TIMESTAMP(),
                @mode, @amount,
                @createdBy
            );
        """, new
        {
            bid = budgetId,
            ym = yearMonth,
            mode = carryOverMode,
            amount = carryOverAmount,
            createdBy = createdByUserId
        });
    }

    public static async Task SeedClosedMonthAsync(
        string cs,
        Guid budgetId,
        string yearMonth,
        string carryOverMode,
        decimal? carryOverAmount,
        decimal totalIncome,
        decimal totalExpenses,
        decimal totalSavings,
        decimal totalDebtPayments,
        decimal finalBalance,
        Guid createdByUserId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth (
                Id, BudgetId, YearMonth, Status, OpenedAt, ClosedAt,
                CarryOverMode, CarryOverAmount,
                SnapshotTotalIncomeMonthly,
                SnapshotTotalExpensesMonthly,
                SnapshotTotalSavingsMonthly,
                SnapshotTotalDebtPaymentsMonthly,
                SnapshotFinalBalanceMonthly,
                CreatedByUserId
            )
            VALUES (
                UUID_TO_BIN(UUID()), @bid, @ym, 'closed', UTC_TIMESTAMP(), UTC_TIMESTAMP(),
                @mode, @amount,
                @inc, @exp, @sav, @debt, @final,
                @createdBy
            );
        """, new
        {
            bid = budgetId,
            ym = yearMonth,
            mode = carryOverMode,
            amount = carryOverAmount,
            inc = totalIncome,
            exp = totalExpenses,
            sav = totalSavings,
            debt = totalDebtPayments,
            final = finalBalance,
            createdBy = createdByUserId
        });
    }
}
