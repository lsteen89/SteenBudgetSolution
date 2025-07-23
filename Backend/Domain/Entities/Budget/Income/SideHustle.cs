using Backend.Domain.Enums;

namespace Backend.Domain.Entities.Budget.Income
{
    public class SideHustle
    {
        public Guid Id { get; set; }              // will be set in executor
        public Guid IncomeId { get; set; }        // set in executor
        public string Name { get; set; } = string.Empty;
        public decimal IncomeMonthly { get; set; }
        public Frequency Frequency { get; set; }
        public DateTime CreatedAt { get; set; } // The date and time when the SideHustle was created
        public DateTime? UpdatedAt { get; set; } // The date and time when the SideHustle was last updated

        public Guid CreatedByUserId { get; set; } // The ID of the user who created the SideHustle
        public Guid? UpdatedByUserId { get; set; } // The ID of the user who last updated the SideHustle
    }
}