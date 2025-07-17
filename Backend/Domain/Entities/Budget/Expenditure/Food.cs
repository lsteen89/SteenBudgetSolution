using System;

namespace Backend.Domain.Entities.Budget.Expenditure
{
    public class Food
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public decimal? FoodStoreExpenses { get; set; }
        public decimal? TakeoutExpenses { get; set; }
    }
}
