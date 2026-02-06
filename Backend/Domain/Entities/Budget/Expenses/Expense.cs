using Backend.Application.DTO.Budget.Expenditure;

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
        public void RemoveItemsInCategories(IReadOnlySet<Guid> categoryIds)
        {
            Items.RemoveAll(x => categoryIds.Contains(x.CategoryId));
        }
        public static IReadOnlySet<Guid> GetOwnedExpenseCategories(ExpenditureData dto)
        {
            var owned = new HashSet<Guid>();

            if (dto.Housing is not null) owned.Add(ExpenseCategories.Housing);
            if (dto.Food is not null) owned.Add(ExpenseCategories.Food);
            if (dto.FixedExpenses is not null) owned.Add(ExpenseCategories.FixedExpense);
            if (dto.Transport is not null) owned.Add(ExpenseCategories.Transport);
            if (dto.Clothing is not null) owned.Add(ExpenseCategories.Clothing);
            if (dto.Subscriptions is not null) owned.Add(ExpenseCategories.Subscription);

            return owned;
        }
    }
}
