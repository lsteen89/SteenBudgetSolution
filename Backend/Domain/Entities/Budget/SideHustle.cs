using Backend.Domain.Enums;

namespace Backend.Domain.Entities.Budget
{
    public class SideHustle
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public decimal MonthlyIncome { get; set; }

        // Foreign key to the main Income record
        public Guid IncomeId { get; set; }
        // Navigation property back to the parent Income
        public Income Income { get; set; }
    }
}