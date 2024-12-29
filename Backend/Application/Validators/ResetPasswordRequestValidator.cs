using FluentValidation;
using Backend.Application.DTO;

namespace Backend.Application.Validators
{

    public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
    {
        public ResetPasswordRequestValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("Invalid email format.")
                .Matches(@"^[^\s@]+@[^\s@]+\.[^\s@]+$").WithMessage("Email must be a valid format and cannot contain spaces.");
        }
    }
}
