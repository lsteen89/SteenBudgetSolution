public sealed class DashboardRecurringExpenseDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string CategoryName { get; init; } = default!;
    public decimal AmountMonthly { get; init; }
}
