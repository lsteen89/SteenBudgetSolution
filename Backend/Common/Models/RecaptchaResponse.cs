namespace Backend.Common.Models
{
    public class RecaptchaResponse
    {
        public bool Success { get; set; }
        public DateTime Challenge_ts { get; set; }
        public string Hostname { get; set; }
        public IEnumerable<string> ErrorCodes { get; set; }
    }
}
