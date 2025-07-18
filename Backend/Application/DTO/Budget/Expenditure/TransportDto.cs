namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class TransportDto
    {
        public decimal? MonthlyFuelCost { get; set; }
        public decimal? MonthlyInsuranceCost { get; set; }
        public decimal? MonthlyTotalCarCost { get; set; }
        public decimal? MonthlyTransitCost { get; set; }
    }
}
