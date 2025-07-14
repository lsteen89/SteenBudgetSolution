using Backend.Domain.Enums;

namespace Backend.Application.DTO.Budget
{
    public class SideHustleData
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public Frequency SalaryFrequency { get; set; }
        public decimal Income { get; set; }
    }
}
