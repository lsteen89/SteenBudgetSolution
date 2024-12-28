namespace Backend.Domain.Entities
{
    public class UserLoginModel
    {
        public string? Persoid{ get; set; }
        public int LoginAttempts { get; set; }
        public DateTime? AttemptTime { get; set; }
        public string IpAddress { get; set; }
    }
}
