using System;

namespace Backend.Domain.Entities.Budget.Expenditure
{
    public class Clothing
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public decimal? MonthlyClothingCost { get; set; }
    }
}
