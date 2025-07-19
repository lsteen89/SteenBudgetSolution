using System;

namespace Backend.Domain.Entities.Budget.Expenditure.Archive
{
    public sealed class Rent
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public string? HomeType { get; set; }
        public decimal? MonthlyRent { get; set; }
        public decimal? RentExtraFees { get; set; }
        public decimal? MonthlyFee { get; set; }
        public decimal? BrfExtraFees { get; set; }
        public decimal? MortgagePayment { get; set; }
        public decimal? HouseotherCosts { get; set; }
        public decimal? OtherCosts { get; set; }
    }
}
