using Backend.Domain.Entities.User;
using Backend.Domain.Enums;

// <summary>
// Represents the main income details for a user, including salary and side hustles.
// It also includes household members' income details.
// This entity is used to store the income information in the database.
// It is designed to be flexible for future extensions, such as adding more income sources or details.
// </summary>

namespace Backend.Domain.Entities.Budget
{
    public class Income
    {
        public int Id { get; set; }
        public Guid Persoid { get; set; } // Foreign key to User

        // Main salary details from the form
        public decimal NetSalary { get; set; }
        public Frequency SalaryFrequency { get; set; }

        // Navigation properties for the one-to-many relationships
        public ICollection<SideHustle> SideHustles { get; set; } = new List<SideHustle>();
        public ICollection<HouseholdMember> HouseholdMembers { get; set; } = new List<HouseholdMember>();

        // Navigation property to the User
        public UserModel User { get; set; }

        // Audit fields
        public string CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
    }
}
