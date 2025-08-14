using Backend.Application.Abstractions.Infrastructure.Security;
using Newtonsoft.Json;
using Backend.Common.Models;
namespace Backend.Common.Services
{
    public class RecaptchaService : IRecaptchaService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<RecaptchaService> _logger;
        private readonly HttpClient _httpClient;

        public RecaptchaService(IConfiguration configuration, ILogger<RecaptchaService> logger, HttpClient httpClient)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClient;
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                var secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY")
                    ?? throw new InvalidOperationException("reCAPTCHA secret key not found.");

                _logger.LogInformation("Verifying reCAPTCHA with token: {Token}", token);

                var url = $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}";
                var response = await _httpClient.PostAsync(url, null);
                var jsonString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Received response from reCAPTCHA API: {Response}", jsonString);

                var recaptchaResponse = JsonConvert.DeserializeObject<RecaptchaResponse>(jsonString);

                if (recaptchaResponse?.Success == true)
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
