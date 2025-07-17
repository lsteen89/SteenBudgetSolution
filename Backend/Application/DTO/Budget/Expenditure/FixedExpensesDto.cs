using System.Collections.Generic;

namespace Backend.Application.DTO.Budget.Expenditure
{
    public class FixedExpensesDto
    {
        public decimal? Electricity { get; set; }
        public decimal? Insurance { get; set; }
        public decimal? Internet { get; set; }
        public decimal? Phone { get; set; }
        public decimal? UnionFees { get; set; }
        public List<CustomFixedExpenseDto>? CustomExpenses { get; set; }
    }
}
