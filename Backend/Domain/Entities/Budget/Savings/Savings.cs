using System;
using System.Collections.Generic;

namespace Backend.Domain.Entities.Budget.Savings
{
    public class Savings
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public decimal MonthlySavings { get; set; }

        // collection of savings methods and goals
        public ICollection<SavingsMethod> SavingMethods { get; private set; } = new List<SavingsMethod>();
        public ICollection<SavingsGoal> SavingsGoals { get; private set; } = new List<SavingsGoal>();

        
        public void AddMethod(SavingsMethod method)
        {
            if (method is null || string.IsNullOrWhiteSpace(method.Method)) return;
            method.SavingsId = this.Id;
            this.SavingMethods.Add(method);
        }

        public void AddGoal(SavingsGoal goal)
        {
            if (goal is null) return;

            // Set the family name on the new soldier
            goal.SavingsId = this.Id;

            // Add him to the crew
            this.SavingsGoals.Add(goal);
        }
        public DateTime CreatedAt { get; set; } // The date and time when the SavingsGoal was created
        public DateTime? UpdatedAt { get; set; } // The date and time when the SavingsGoal was last updated

        public Guid CreatedByUserId { get; set; } // The ID of the user who created the SavingsGoal
        public Guid? UpdatedByUserId { get; set; } // The ID of the user who last updated the SavingsGoal
    }
}
