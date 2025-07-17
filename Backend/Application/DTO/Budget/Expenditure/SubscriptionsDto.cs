using System.Collections.Generic;

namespace Backend.Application.DTO.Budget.Expenditure
{
    public class SubscriptionsDto
    {
        public decimal? Netflix { get; set; }
        public decimal? Spotify { get; set; }
        public decimal? HBOMax { get; set; }
        public decimal? Viaplay { get; set; }
        public decimal? DisneyPlus { get; set; }
        public List<CustomSubscriptionDto> CustomSubscriptions { get; set; } 
    }
}
