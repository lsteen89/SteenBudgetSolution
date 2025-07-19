namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class ExpenditureData
    {
        public RentDto? Rent { get; set; }
        public FoodDto? Food { get; set; }
        public TransportDto? Transport { get; set; }
        public ClothingDto? Clothing { get; set; }
        public FixedExpensesDto? FixedExpenses { get; set; }
        public SubscriptionsDto? Subscriptions { get; set; }
    }
}
