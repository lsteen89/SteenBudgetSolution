namespace Backend.Domain.Entities.Budget.Expenditure.Archive
{
    public class Expenditure
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }

        public Rent? Rent { get; set; }
        public Food? Food { get; set; }
        public Transport? Transport { get; set; }
        public Clothing? Clothing { get; set; }
        public FixedExpenses? FixedExpenses { get; set; }
        public Subscriptions? Subscriptions { get; set; }
    }
}
