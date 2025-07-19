using System;
using System.Collections.Generic;

namespace Backend.Domain.Entities.Budget.Expenditure.Archive
{
    public class FixedExpenses
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public decimal? Electricity { get; set; }
        public decimal? Insurance { get; set; }
        public decimal? Internet { get; set; }
        public decimal? Phone { get; set; }
        public decimal? UnionFees { get; set; }

        public List<CustomExpense> CustomExpenses { get; set; } = new();
    }
}
