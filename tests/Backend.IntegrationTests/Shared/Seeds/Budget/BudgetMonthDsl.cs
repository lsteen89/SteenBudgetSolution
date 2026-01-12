using Dapper;
using MySqlConnector;

namespace Backend.IntegrationTests.Shared.Seeds.Budget;

internal static class BudgetMonthDsl
{
    public static Task InsertOpenAsync(string cs, Guid budgetId, string ym, DateTime openedAtUtc, Guid createdByUserId)
        => InsertAsync(cs, budgetId, ym, "open", openedAtUtc, createdByUserId, closedAtUtc: null, carryOverMode: "none", carryOverAmount: null);

    public static async Task InsertAsync(
        string cs,
        Guid budgetId,
        string yearMonth,
        string status,
        DateTime openedAtUtc,
        Guid createdByUserId,
        DateTime? closedAtUtc,
        string carryOverMode,
        decimal? carryOverAmount)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth
            (Id, BudgetId, YearMonth, Status, OpenedAt, ClosedAt, CarryOverMode, CarryOverAmount, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, @ym, @status, @openedAt, @closedAt, @mode, @amount, UTC_TIMESTAMP(), @uid);
        """, new
        {
            bid = budgetId,
            ym = yearMonth,
            status,
            openedAt = openedAtUtc,
            closedAt = closedAtUtc,
            mode = carryOverMode,
            amount = carryOverAmount,
            uid = createdByUserId
        });
    }
    public static Task InsertOpenMonthAsync(string cs, Guid budgetId, string ym, decimal carryOverAmount, Guid createdByUserId, DateTime openedAtUtc)
    {
        var mode = carryOverAmount == 0m ? "none" : "custom";
        decimal? amount = mode == "custom" ? carryOverAmount : null;

        return InsertAsync(cs, budgetId, ym, "open", openedAtUtc, createdByUserId, null, mode, amount);
    }

}
