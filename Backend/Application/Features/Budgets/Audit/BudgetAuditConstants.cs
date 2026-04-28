namespace Backend.Application.Features.Budgets.Audit;

public static class BudgetAuditEntityTypes
{
    public const string ExpenseItem = "expense-item";
    public const string SalaryPaymentTiming = "salary-payment-timing";
}

public static class BudgetAuditChangeTypes
{
    public const string Created = "created";
    public const string Updated = "updated";
    public const string Deleted = "deleted";
}

public static class BudgetMonthLifecycleEventTypes
{
    public const string Opened = "opened";
    public const string Closed = "closed";
    public const string Skipped = "skipped";
    public const string NextMonthCreated = "next-month-created";
    public const string CarryOverApplied = "carry-over-applied";
}
