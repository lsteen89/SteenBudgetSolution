namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class HousingDto
    {
        public string? HomeType { get; set; } // "rent" | "brf" | "house" | "free"

        public HousingPaymentDto? Payment { get; set; }

        public HousingRunningCostsDto? RunningCosts { get; set; }
    }

    public sealed class HousingPaymentDto
    {
        public decimal? MonthlyRent { get; set; }
        public decimal? MonthlyFee { get; set; }
        public decimal? ExtraFees { get; set; }
    }

    public sealed class HousingRunningCostsDto
    {
        public decimal? Electricity { get; set; }
        public decimal? Heating { get; set; }
        public decimal? Water { get; set; }
        public decimal? Waste { get; set; }
        public decimal? Other { get; set; }
    }
}
