namespace Backend.Domain.Entities
{
    public class JwtTokenModel
    {
        public Guid Persoid { get; set; }
        public string Email { get; set; }
        public DateTime ExpiryDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public string DeviceId { get; set; } 
        public string UserAgent { get; set; }
        public bool FirstLogin { get; set; }
    }
}

