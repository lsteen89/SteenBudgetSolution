namespace Backend.Domain.Entities.Budget.Expenditure.Archive
{
    public class SubscriptionItem
    {
        public Guid Id { get; set; }
        public Guid SubscriptionsId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
    }
}
