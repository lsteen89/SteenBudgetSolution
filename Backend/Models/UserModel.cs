using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class UserModel
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; } // Non-nullable, must always have a value

        [Required(ErrorMessage = "First name is required.")]
        [StringLength(50, ErrorMessage = "First name cannot be longer than 50 characters.")]
        [RegularExpression(@"^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$", ErrorMessage = "Invalid first name format.")]
        public string? FirstName { get; set; }

        [Required(ErrorMessage = "Last name is required.")]
        [StringLength(50, ErrorMessage = "Last name cannot be longer than 50 characters.")]
        [RegularExpression(@"^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$", ErrorMessage = "Invalid last name format.")]
        public string? LastName { get; set; }

        [Required(ErrorMessage = "Email is required.")]
        [StringLength(100, ErrorMessage = "E-mail cannot be longer than 100 characters.")]
        [RegularExpression(@"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", ErrorMessage = "Invalid email format")]
        public string? Email { get; set; }
        public bool EmailConfirmed { get; set; }

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, ErrorMessage = "Password cannot be longer than 100 characters.")]
        [RegularExpression(@"^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$", ErrorMessage = "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol.")]
        public string? Password { get; set; }
        public string? Roles { get; set; }
        public bool FirstLogin { get; set; }
        public bool IsVerified { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
    }

}
