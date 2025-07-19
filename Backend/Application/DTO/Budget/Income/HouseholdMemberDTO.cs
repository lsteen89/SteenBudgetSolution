using Backend.Domain.Enums;

namespace Backend.Application.DTO.Budget.Income
{
    public sealed class HouseholdMemberDto
    {
        public string? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal? Income { get; set; }
        public Frequency Frequency { get; set; }
    }
}
