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
    }
    public class SavingsMethod
    {
        public Guid Id { get; set; }
        public string Method { get; set; } = string.Empty;
        public Guid SavingsId { get; set; } // Foreign key
    }

}
