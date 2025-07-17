using System;
using System.Collections.Generic;

namespace Backend.Domain.Entities.Budget.Expenditure
{
    public class Subscriptions
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public decimal? Netflix { get; set; }
        public decimal? Spotify { get; set; }
        public decimal? HBOMax { get; set; }
        public decimal? Viaplay { get; set; }
        public decimal? DisneyPlus { get; set; }
        public List<CustomSubscription> CustomSubscriptions { get; set; } = new List<CustomSubscription>();
    }
}
