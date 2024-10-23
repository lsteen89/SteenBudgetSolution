using Newtonsoft.Json;

namespace Backend.Helpers
{
    public class RecaptchaResponse
    {
        public bool Success { get; set; }
        public DateTime Challenge_ts { get; set; }
        public string Hostname { get; set; }
        public IEnumerable<string> ErrorCodes { get; set; }
    }

    public class RecaptchaHelper
    {
        private readonly IConfiguration _configuration;

        public RecaptchaHelper(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<bool> VerifyRecaptchaAsync(string token)
        {
            var secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY")
                ?? throw new InvalidOperationException("reCAPTCHA secret key not found.");
            var client = new HttpClient();
            var response = await client.PostAsync($"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}", null);
            var jsonString = await response.Content.ReadAsStringAsync();
            var recaptchaResponse = JsonConvert.DeserializeObject<RecaptchaResponse>(jsonString);
             
            return recaptchaResponse != null && recaptchaResponse.Success;
        }
    }
}
