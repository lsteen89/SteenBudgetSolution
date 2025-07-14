using Backend.Domain.Enums;

namespace Backend.Domain.Entities.Budget
{
    public class SideHustle
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal MonthlyIncome { get; set; }

        // Foreign key to the main Income record
        public int IncomeId { get; set; }
        // Navigation property back to the parent Income
        public Income Income { get; set; }
    }
}