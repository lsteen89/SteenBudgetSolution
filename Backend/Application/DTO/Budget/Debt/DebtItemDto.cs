namespace Backend.Application.DTO.Budget.Debt
{
    public class DebtItemDto
    {
        public string Name { get; set; } = string.Empty; // The name of the debt, e.g., "Credit Card", "Student Loan", etc.
        public string Type { get; set; } = string.Empty; // The type of debt, e.g., "installment", "revolving", "private", or "bank_loan"
        public decimal Balance { get; set; } // The current balance of the debt
        public decimal Apr { get; set; } // The annual percentage rate (APR) of the debt

        public decimal? MonthlyFee { get; set; } // The monthly fee associated with the debt, if any
        public decimal? MinPayment { get; set; } // The minimum payment required for the debt each month
        public int? TermMonths { get; set; } // The term of the debt in months, if applicable

    }
}
