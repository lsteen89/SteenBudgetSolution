using Backend.Helpers;
using Backend.Interfaces;

namespace Backend.Services.Validation
{
    public class RecaptchaService : IRecaptchaService
    {
        private readonly RecaptchaHelper _recaptchaHelper;

        public RecaptchaService(RecaptchaHelper recaptchaHelper)
        {
            _recaptchaHelper = recaptchaHelper;
        }

        public Task<bool> ValidateTokenAsync(string token)
        {
            return _recaptchaHelper.VerifyRecaptchaAsync(token);
        }
    }
}
