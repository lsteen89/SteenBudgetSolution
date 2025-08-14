using System.ComponentModel.DataAnnotations;

namespace Backend.Domain.Entities.User
{
    public class UserModel
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; }

        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public bool EmailConfirmed { get; set; }
        public required string Email { get; init; }
        public required string Password { get; init; }
        public string? Roles { get; set; }
        public bool FirstLogin { get; set; }
        public bool? locked { get; set; }
        public DateTime? LockoutUntil { get; set; }
        public DateTime? LastLoginUtc { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
    }

}
