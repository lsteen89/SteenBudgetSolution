using Backend.Application.Interfaces.RecaptchaService;
using Backend.Common.Utilities;

namespace Backend.Application.Services.Validation
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
