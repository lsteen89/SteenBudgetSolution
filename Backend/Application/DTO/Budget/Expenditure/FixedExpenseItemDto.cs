namespace Backend.Application.DTO.Budget.Expenditure
{
    // <summary>
    /// Represents a custom fixed expense item in the budget.

    public class CustomFixedExpenseDto
    {
        public string Name { get; set; }
        public decimal? Cost { get; set; }
    }
}
