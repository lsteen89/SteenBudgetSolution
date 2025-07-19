using Backend.Domain.Enums;
// <summary>
// Represents the main income details for a user, including salary and side hustles.
// It also includes household members' income details.
// This entity is used to store the income information in the database.
// It is designed to be flexible for future extensions, such as adding more income sources or details.
// </summary>

namespace Backend.Domain.Entities.Budget.Income
{
    public class Income
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }

        public decimal NetSalaryMonthly { get; set; }
        public Frequency SalaryFrequency { get; set; } // original user freq retained

        public ICollection<SideHustle> SideHustles { get; set; } = new List<SideHustle>();
        public ICollection<HouseholdMember> HouseholdMembers { get; set; } = new List<HouseholdMember>();
    }
}
