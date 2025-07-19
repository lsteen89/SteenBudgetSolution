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
    }
}