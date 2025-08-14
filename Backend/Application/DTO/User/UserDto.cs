namespace Backend.Application.DTO.User
{
    public class UserDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public Guid? Persoid { get; set; }
        public IReadOnlyList<string> Roles { get; init; } = Array.Empty<string>();
        public bool FirstLogin { get; set; }
        public DateTime? LastLogin { get; set; } // DateTime?

    }
}
