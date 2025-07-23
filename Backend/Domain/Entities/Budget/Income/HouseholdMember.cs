using Backend.Domain.Enums;

// <summary>
// Represents a household member's income details.
// Im not sure how this will work in the future, but for now,
// it is a simple entity that can be extended later if needed.
// </summary>

namespace Backend.Domain.Entities.Budget.Income
{
    public class HouseholdMember
    {
        public Guid Id { get; set; }              // will be set in executor
        public Guid IncomeId { get; set; }        // set in executor
        public string Name { get; set; } = string.Empty;
        public decimal IncomeMonthly { get; set; }
        public Frequency Frequency { get; set; }
        public DateTime CreatedAt { get; set; } // The date and time when the HouseholdMember was created
        public DateTime? UpdatedAt { get; set; } // The date and time when the HouseholdMember was last updated

        public Guid CreatedByUserId { get; set; } // The ID of the user who created the HouseholdMember
        public Guid? UpdatedByUserId { get; set; } // The ID of the user who last updated the HouseholdMember
    }
}
