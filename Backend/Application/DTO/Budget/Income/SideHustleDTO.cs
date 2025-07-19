using Backend.Domain.Enums;

namespace Backend.Application.DTO.Budget.Income
{
    public sealed class SideHustleDto
    {
        public string? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal? Income { get; set; }
        public Frequency Frequency { get; set; }
    }
}
