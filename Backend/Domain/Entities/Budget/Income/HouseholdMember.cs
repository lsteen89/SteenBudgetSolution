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
    }
}
