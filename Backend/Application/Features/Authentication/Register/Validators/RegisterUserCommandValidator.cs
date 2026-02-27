
using FluentValidation;
using Backend.Application.Features.Authentication.Register.RegisterAndIssueSession;

namespace Backend.Application.Features.Authentication.Register.Validators;

public sealed class RegisterUserCommandValidator : AbstractValidator<RegisterAndIssueSessionCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);

        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);

        When(x => !x.IsSeedingOperation, () =>
        {
            RuleFor(x => x.HumanToken).NotEmpty().WithMessage("Verification failed. Please complete the CAPTCHA.");
            RuleFor(x => x.Honeypot).Must(string.IsNullOrWhiteSpace).WithMessage("Something went wrong. Please try again.");
        });
    }
}
