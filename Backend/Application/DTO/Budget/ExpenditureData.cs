using Backend.Application.DTO.Budget.Expenditure;

namespace Backend.Application.DTO.Budget
{
    public class ExpenditureData
    {
        public RentDto? Rent { get; set; }
        public FoodDto? Food { get; set; }
        public UtilitiesDto? Utilities { get; set; }
        public TransportDto? Transport { get; set; }
        public ClothingDto? Clothing { get; set; }
        public FixedExpensesDto? FixedExpenses { get; set; }
        public SubscriptionsDto? Subscriptions { get; set; }
    }
}
