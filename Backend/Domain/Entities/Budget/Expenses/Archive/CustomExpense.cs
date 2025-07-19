namespace Backend.Domain.Entities.Budget.Expenditure.Archive
{
    public class CustomExpense
    {
        public Guid Id { get; set; }
        public Guid FixedExpensesId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
    }
}
