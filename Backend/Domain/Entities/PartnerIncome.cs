namespace Backend.Domain.Entities
{
    public class PartnerIncome
    {
        public int Id { get; set; }
        public Guid PartnerId { get; set; }
        public decimal MainIncome { get; set; }
        public decimal SideIncome { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
        public PartnerModel Partner { get; set; }
    }
}
