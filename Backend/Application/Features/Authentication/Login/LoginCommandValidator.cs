using FluentValidation;

namespace Backend.Application.Features.Authentication.Login;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-post krävs.")
            .EmailAddress().WithMessage("Ogiltig e-postadress.")
            .MaximumLength(254);

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Lösenord krävs.");

        // Optional token: validate only if provided
        When(x => !string.IsNullOrWhiteSpace(x.HumanToken), () =>
        {
            RuleFor(x => x.HumanToken!)
                .MaximumLength(2048);
        });
    }
}
