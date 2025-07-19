using System;

namespace Backend.Domain.Entities.Budget.Expenditure.Archive
{
    public class Utilities
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public decimal? Electricity { get; set; }
        public decimal? Water { get; set; }
    }
}
