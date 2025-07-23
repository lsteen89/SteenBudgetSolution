namespace Backend.Domain.Entities.Budget.Expenses
{
    public sealed class ExpenseItem
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public Guid CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal AmountMonthly { get; set; }
        public DateTime CreatedAt { get; set; } // The date and time when the expense was created
        public DateTime? UpdatedAt { get; set; } // The date and time when the expense was last updated

        public Guid CreatedByUserId { get; set; } // The ID of the user who created the expense
        public Guid? UpdatedByUserId { get; set; } // The ID of the user who last updated the expense
    }
}
