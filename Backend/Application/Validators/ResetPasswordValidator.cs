using FluentValidation;
using Backend.Application.DTO;

namespace Backend.Application.Validators
{
    public class ResetPasswordValidator : AbstractValidator<ResetPassword>
    {
        public ResetPasswordValidator()
        {
            RuleFor(x => x.Token)
                .NotEmpty().WithMessage("Token is required.")
                .Must(token => Guid.TryParse(token.ToString(), out _)).WithMessage("Token must be a valid GUID.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MaximumLength(100).WithMessage("Password cannot be longer than 100 characters.")
                .Matches(@"^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$")
                .WithMessage("Password must have at least one uppercase letter, one number, and one special character.");

            RuleFor(x => x.ConfirmPassword)
                .NotEmpty().WithMessage("Confirmation password is required.")
                .Equal(x => x.Password).WithMessage("Passwords do not match.");
        }
    }
}