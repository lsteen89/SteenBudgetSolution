namespace Backend.Domain.Entities.Budget.Debt
{
    public class Debt
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }

        public string Name { get; set; } = string.Empty; // The name of the debt, e.g., "Credit Card", "Student Loan", etc.
        public string Type { get; set; } = string.Empty; // The type of debt, e.g., "installment", "revolving", "private", or "bank_loan"
        public decimal Balance { get; set; } // The current balance of the debt
        public decimal Apr { get; set; } // The annual percentage rate (APR) of the debt

        public decimal? MonthlyFee { get; set; } // The monthly fee associated with the debt, if any
        public decimal? MinPayment { get; set; } // The minimum payment required for the debt each month
        public int? TermMonths { get; set; } // The term of the debt in months, if applicable

        public DateTime CreatedAt { get; set; } // The date and time when the debt was created
        public DateTime? UpdatedAt { get; set; } // The date and time when the debt was last updated

        public Guid CreatedByUserId { get; set; } // The ID of the user who created the debt
        public Guid? UpdatedByUserId { get; set; } // The ID of the user who last updated the debt
    }
}
