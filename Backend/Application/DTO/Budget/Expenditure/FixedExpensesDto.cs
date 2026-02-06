using System.Collections.Generic;

namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class FixedExpensesDto
    {
        public decimal? Insurance { get; set; }
        public decimal? Internet { get; set; }
        public decimal? Phone { get; set; }
        public decimal? Gym { get; set; }
        // completely flexible extras
        public List<CustomExpenseDto> CustomExpenses { get; set; } = new();
    }
}

