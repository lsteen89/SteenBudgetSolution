using System.Collections.Generic;

namespace Backend.Application.DTO.Budget.Expenditure
{
    public sealed class SubscriptionsDto
    {
        public List<SubscriptionDto> Subscriptions { get; set; } = new();
    }
}
