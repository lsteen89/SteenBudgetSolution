namespace Backend.Application.Models
{
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorMessage { get; set; }
        public Guid Persoid { get; set; }
        public string Email { get; set; }

    }
}
