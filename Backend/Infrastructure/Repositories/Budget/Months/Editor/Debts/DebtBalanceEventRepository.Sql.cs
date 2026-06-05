namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Debts;

public sealed partial class DebtBalanceEventRepository
{
    // Mirrors the column order in `database/init/05-BudgetAuditEvents.sql`.
    // `Delta` is written by the application (NewBalance - OldBalance) so the
    // SQL stays portable; the table's CHECK constraints enforce non-negative
    // balances and the supported scope vocabulary.
    private const string InsertDebtBalanceEvent = @"
    INSERT INTO DebtBalanceEvent
    (
        Id,
        BudgetId,
        DebtId,
        BudgetMonthDebtId,
        BudgetMonthId,
        OldBalance,
        NewBalance,
        Delta,
        Scope,
        Note,
        ChangedAt,
        ChangedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetId,
        @DebtId,
        @BudgetMonthDebtId,
        @BudgetMonthId,
        @OldBalance,
        @NewBalance,
        @Delta,
        @Scope,
        @Note,
        @ChangedAt,
        @ChangedByUserId
    );";
}
