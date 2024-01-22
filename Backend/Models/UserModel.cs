namespace Backend.Models
{
    public class UserModel
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public bool EmailConfirmed { get; set; }
        public string Password { get; set; }
        public string PasswordSalt { get; set; }
        public string Roles { get; set; }
        public bool FirstLogin { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
    }

}
