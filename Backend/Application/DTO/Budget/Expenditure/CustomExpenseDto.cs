namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class CustomExpenseDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
    }
}
