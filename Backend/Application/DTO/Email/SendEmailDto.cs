namespace Backend.Application.DTO.Email
{
    public class SendEmailDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? subject { get; set; }
        public string? body { get; set; }
        public string? SenderEmail { get; set; }
        public string? CaptchaToken { get; set; }
    }
}