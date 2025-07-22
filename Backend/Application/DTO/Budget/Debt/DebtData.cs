namespace Backend.Application.DTO.Budget.Debt
{
    public class DebtData
    {
        public List<DebtItemDto>? Debts { get; set; } // The details of the debt
        public DebtSummaryDto? Summary { get; set; } // Contains repayment strategy 
    }
}
