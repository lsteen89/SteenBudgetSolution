namespace Backend.Domain.Entities.Budget.Expenses
{
    public sealed class ExpenseItem
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public Guid CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal AmountMonthly { get; set; }
    }
}
