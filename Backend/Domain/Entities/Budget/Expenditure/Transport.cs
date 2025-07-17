using System;

namespace Backend.Domain.Entities.Budget.Expenditure
{
    public class Transport
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public decimal? MonthlyFuelCost { get; set; }
        public decimal? MonthlyInsuranceCost { get; set; }
        public decimal? MonthlyTotalCarCost { get; set; }
        public decimal? MonthlyTransitCost { get; set; }
    }
}
