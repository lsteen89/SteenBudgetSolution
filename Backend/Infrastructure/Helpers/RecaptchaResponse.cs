using Newtonsoft.Json;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.Helpers
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
        private readonly ILogger<RecaptchaHelper> _logger;

        public RecaptchaHelper(IConfiguration configuration, ILogger<RecaptchaHelper> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> VerifyRecaptchaAsync(string token)
        {
            try
            {
                var secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY")
                    ?? throw new InvalidOperationException("reCAPTCHA secret key not found.");

                // Log token and secret key to verify values before making the Google API request
                _logger.LogInformation("Verifying reCAPTCHA with token: {Token}", token);

                var client = new HttpClient();
                var url = $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}";

                _logger.LogInformation("Sending reCAPTCHA verification request to {Url}", url);

                var response = await client.PostAsync(url, null);
                var jsonString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Received response from reCAPTCHA API: {Response}", jsonString);

                var recaptchaResponse = JsonConvert.DeserializeObject<RecaptchaResponse>(jsonString);

                if (recaptchaResponse != null && recaptchaResponse.Success)
                {
                    _logger.LogInformation("reCAPTCHA validation successful.");
                    return true;
                }

                _logger.LogWarning("reCAPTCHA validation failed. ErrorCodes: {ErrorCodes}", recaptchaResponse?.ErrorCodes);
                return false;
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "HTTP request to reCAPTCHA API failed.");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while verifying reCAPTCHA.");
                return false;
            }
        }
    }
}
