using Backend.Domain.Enums;

namespace Backend.Application.DTO.Budget
{
    public class HouseholdMemberData
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public decimal Income { get; set; }   
        public Frequency Frequency { get; set; }
    }
}
