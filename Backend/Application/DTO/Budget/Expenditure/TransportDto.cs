namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class TransportDto
    {
        public decimal? FuelOrCharging { get; set; }
        public decimal? CarInsurance { get; set; }
        public decimal? ParkingFee { get; set; }
        public decimal? OtherCarCosts { get; set; }
        public decimal? PublicTransit { get; set; }
    }
}
