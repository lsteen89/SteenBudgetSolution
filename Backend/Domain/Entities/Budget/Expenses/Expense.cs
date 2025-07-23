namespace Backend.Domain.Entities.Budget.Expenses
{
    public sealed class Expense
    {
        public Guid BudgetId { get; set; }
        public List<ExpenseItem> Items { get; set; } = new();
        public void AddItem(Guid categoryId, string name, decimal? amount)
        {
            if (amount is null || amount <= 0) return;
            if (string.IsNullOrWhiteSpace(name)) return;
            if (!ExpenseCategories.All.Contains(categoryId))
                throw new InvalidOperationException($"Unknown category id '{categoryId}'.");

            Items.Add(new ExpenseItem
            {
                Id = Guid.Empty,
                BudgetId = BudgetId,
                CategoryId = categoryId,
                Name = name.Trim(),
                AmountMonthly = decimal.Round(amount.Value, 2, MidpointRounding.AwayFromZero),
            });
        }
    }
}
