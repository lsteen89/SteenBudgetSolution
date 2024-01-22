namespace Backend.Models
{
    public class PartnerModel
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; }
        public Guid PartnerId { get; set; }
        public string Name { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
        public UserModel User { get; set; }
    }
}
