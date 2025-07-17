using System;

namespace Backend.Domain.Entities.Budget.Expenditure
{
    public class CustomFixedExpense
    {
        // The primary key for this entity
        public Guid Id { get; set; }

        // The foreign key linking back to the parent FixedExpenses record
        public Guid FixedExpensesId { get; set; }

        public string Name { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
    }
}
