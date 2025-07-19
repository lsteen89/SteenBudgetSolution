using Backend.Application.DTO.Budget.Expenditure;

namespace Backend.Application.DTO.Budget.Savings
{
    public class SavingsGoalDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public decimal? TargetAmount { get; set; }
        public string TargetDate { get; set; }
        public decimal? AmountSaved { get; set; }
    }
}
