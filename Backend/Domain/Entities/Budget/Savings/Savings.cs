using System;
using System.Collections.Generic;

namespace Backend.Domain.Entities.Budget.Savings
{
    public class Savings
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }

        public string? SavingHabit { get; set; } // If the user has a hait of saving, yes, sometimes, or no
        public decimal MonthlySavings { get; set; } // The amount the user saves monthly, user never reaches here if they have no saving habit

        public ICollection<string> SavingMethods { get; set; } = new List<string>(); // List of saving methods, e.g., "auto", "manual"

        public ICollection<SavingsGoal> SavingsGoals { get; set; } = new List<SavingsGoal>(); // List of savings goals associated with this savings record
    }
}
