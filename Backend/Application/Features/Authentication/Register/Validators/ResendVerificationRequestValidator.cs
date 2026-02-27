
using FluentValidation;
using Backend.Application.Features.Authentication.Register.ResendVerificationMail;

namespace Backend.Application.Features.Authentication.Register.Validators;

public sealed class ResendVerificationRequestValidator : AbstractValidator<ResendVerificationCommand>
{
    public ResendVerificationRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254);
    }
}
