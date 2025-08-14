namespace Backend.Common.Models
{
    public class RecaptchaResponse
    {
        public required bool Success { get; set; }
        public required DateTime Challenge_ts { get; set; }
        public required string Hostname { get; set; }
        public required IEnumerable<string> ErrorCodes { get; set; }
    }
}
