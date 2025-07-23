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
        public DateTime CreatedAt { get; set; } // The date and time when the SavingsGoal was created
        public DateTime? UpdatedAt { get; set; } // The date and time when the SavingsGoal was last updated

        public Guid CreatedByUserId { get; set; } // The ID of the user who created the SavingsGoal
        public Guid? UpdatedByUserId { get; set; } // The ID of the user who last updated the SavingsGoal
    }
}
