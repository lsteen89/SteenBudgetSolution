namespace Backend.Application.DTO.Budget.Debt
{
    public class DebtSummaryDto
    {
        public string? RepaymentStrategy { get; set; } = string.Empty; // The strategy for repaying debts, e.g., "avalanche", "snowball"
    }
}
