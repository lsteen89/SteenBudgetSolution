namespace Backend.Domain.Entities.Auth
{
    public class JwtTokenModel
    {
        public required Guid Persoid { get; set; }
        public required string Email { get; set; }
        public required IReadOnlyList<string> Roles { get; set; }
        public required DateTime? ExpiryDate { get; set; }
        public required DateTime? CreatedAt { get; set; }
        public required string DeviceId { get; set; }
        public required string UserAgent { get; set; }
        public required Guid SessionId { get; set; }
    }
}

