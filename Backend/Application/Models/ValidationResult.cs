namespace Backend.Application.Models
{
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorMessage { get; set; }
        public string UserId { get; set; }
        public string Email { get; set; }

    }
}
