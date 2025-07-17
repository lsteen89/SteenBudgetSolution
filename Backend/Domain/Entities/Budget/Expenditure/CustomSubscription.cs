using System;

namespace Backend.Domain.Entities.Budget.Expenditure
{
    public class CustomSubscription
    {
        public Guid Id { get; set; }
        public Guid SubscriptionsId { get; set; } 
        public string? Name { get; set; }
        public decimal? Cost { get; set; }
    }
}
