namespace Backend.DTO
{
    public class SendEmailDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? subject { get; set; }
        public string? Email { get; set; }
        public string? Token { get; set; }
    }
}