using Backend.Domain.Enums;

// <summary>
// Represents a household member's income details.
// Im not sure how this will work in the future, but for now,
// it is a simple entity that can be extended later if needed.
// </summary>

namespace Backend.Domain.Entities.Budget
{
    public class HouseholdMember
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal IncomeAmount { get; set; }
        public Frequency IncomeFrequency { get; set; }

        // Foreign key to the main Income record
        public int IncomeId { get; set; }
        // Navigation property back to the parent Income
        public Income Income { get; set; }
    }
}
