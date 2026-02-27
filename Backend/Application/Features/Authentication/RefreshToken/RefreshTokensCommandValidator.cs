using FluentValidation;
namespace Backend.Application.Features.Authentication.RefreshToken;

public sealed class RefreshTokensCommandValidator : AbstractValidator<RefreshTokensCommand>
{
    public RefreshTokensCommandValidator()
    {
        RuleFor(x => x.AccessToken)
            .NotEmpty().WithMessage("Access token missing.");

        RuleFor(x => x.RefreshCookie)
            .NotEmpty().WithMessage("Refresh token missing.");

        RuleFor(x => x.UserAgent)
            .NotEmpty().WithMessage("UserAgent missing.");

        RuleFor(x => x.DeviceId)
            .NotEmpty().WithMessage("DeviceId missing.");
    }
}
