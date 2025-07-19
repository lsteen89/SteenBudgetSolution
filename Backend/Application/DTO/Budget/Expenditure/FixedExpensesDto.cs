using System.Collections.Generic;

namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class FixedExpensesDto
    {
        // built‑in suggestions (nullable—user may omit)
        public decimal? Electricity { get; set; }
        public decimal? Insurance { get; set; }
        public decimal? Internet { get; set; }
        public decimal? Phone { get; set; }
        public decimal? UnionFees { get; set; }

        // completely flexible extras
        public List<CustomExpenseDto> CustomExpenses { get; set; } = new();
    }
}

