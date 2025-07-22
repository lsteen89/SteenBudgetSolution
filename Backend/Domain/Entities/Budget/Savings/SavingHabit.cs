namespace Backend.Domain.Entities.Budget.Savings
{
    public class SavingHabit
    {
        public Guid Id { get; set; }
        public string SavingMethod { get; set; }  // The method of saving, e.g., "auto", "manual"
        public decimal MonthlySavings { get; set; }  // The amount saved monthly
        public Guid SavingsId { get; set; }
    }
}
