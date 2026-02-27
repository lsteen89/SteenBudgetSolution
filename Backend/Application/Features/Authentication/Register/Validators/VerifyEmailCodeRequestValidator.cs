
using FluentValidation;
using Backend.Application.Features.VerifyEmail;

namespace Backend.Application.Features.Authentication.Register.Validators;

public sealed class VerifyEmailCodeRequestValidator : AbstractValidator<VerifyEmailCodeCommand>
{
    public VerifyEmailCodeRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254);

        RuleFor(x => x.Code)
            .NotEmpty()
            .Matches(@"^\d{6}$")
            .WithMessage("Code must be exactly 6 digits.");
    }
}
