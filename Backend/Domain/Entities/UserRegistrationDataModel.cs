namespace Backend.Domain.Entities
{
    // Data model for user registration, containing key fields shared between UserModel and TokenModel
    public class UserRegistrationDataModel
    {
        public Guid PersoId { get; set; }
        public string Email { get; set; }
        public string Token { get; set; }
        public DateTime TokenExpiryDate { get; set; }
    }
}


