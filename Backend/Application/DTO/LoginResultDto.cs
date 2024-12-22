namespace Backend.Application.DTO
{
    public class LoginResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string UserName { get; set; }
        public string Token { get; set; }
    }
}
