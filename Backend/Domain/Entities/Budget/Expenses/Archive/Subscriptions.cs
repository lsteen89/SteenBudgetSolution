using Backend.Application.Models.Wizard;
using System;
using System.Collections.Generic;

namespace Backend.Domain.Entities.Budget.Expenditure.Archive
{
    public class Subscriptions
    {
        public Guid Id { get; set; }
        public Guid BudgetId { get; set; }
        public List<SubscriptionItem> Items { get; set; } = new();
    }
}
