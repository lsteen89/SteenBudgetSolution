namespace Backend.Domain.Entities.Budget.Savings
{
    public class SavingsMethod
    {
        public Guid Id { get; set; }
        public string Method { get; set; } = string.Empty;
        public Guid SavingsId { get; set; } // Foreign key
        public DateTime CreatedAt { get; set; } // The date and time when the SavingsGoal was created
        public DateTime? UpdatedAt { get; set; } // The date and time when the SavingsGoal was last updated

        public Guid CreatedByUserId { get; set; } // The ID of the user who created the SavingsGoal
        public Guid? UpdatedByUserId { get; set; } // The ID of the user who last updated the SavingsGoal
    }
}
