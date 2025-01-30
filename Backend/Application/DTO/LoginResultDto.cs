namespace Backend.Application.DTO
{
    public class LoginResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string UserName { get; set; }
        public string AccessToken { get; set; }
        public string ?RefreshToken { get; set; }
    }
}
