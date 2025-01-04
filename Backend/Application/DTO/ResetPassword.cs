namespace Backend.Application.DTO
{
    public class ResetPassword
    {
        public Guid Token { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
    }
}
