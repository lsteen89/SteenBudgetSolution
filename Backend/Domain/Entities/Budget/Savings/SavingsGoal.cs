using System;

namespace Backend.Domain.Entities.Budget.Savings
{

    public class SavingsGoal
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public decimal? TargetAmount { get; set; }
        public DateTime? TargetDate { get; set; }
        public decimal? AmountSaved { get; set; } // The amount saved towards this goal 

        public Guid SavingsId { get; set; }
        public Savings Savings { get; set; } = null!;
    }
}
