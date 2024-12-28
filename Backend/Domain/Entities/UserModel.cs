using System.ComponentModel.DataAnnotations;

namespace Backend.Domain.Entities
{
    public class UserModel
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; }

        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public bool EmailConfirmed { get; set; }

        public string? Password { get; set; }
        public string? Roles { get; set; }
        public bool FirstLogin { get; set; }
        public bool? locked { get; set; }
        public DateTime? LockoutUntil { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
    }

}
