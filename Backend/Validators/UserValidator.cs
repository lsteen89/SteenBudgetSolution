using FluentValidation;
using Backend.DTO;

namespace Backend.Validators
{
    public class UserValidator : AbstractValidator<UserCreationDto>
    {
        public UserValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .MaximumLength(50).WithMessage("First name cannot be longer than 50 characters.")
                .Matches(@"^[\p{L}]+(([',. -][\p{L} ])?[\p{L}]*)*$").WithMessage("Invalid first name format.");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .MaximumLength(50).WithMessage("Last name cannot be longer than 50 characters.")
                .Matches(@"^[\p{L}]+(([',. -][\p{L} ])?[\p{L}]*)*$").WithMessage("Invalid last name format.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .MaximumLength(100).WithMessage("E-mail cannot be longer than 100 characters.")
                .Matches(@"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$").WithMessage("Invalid email format");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MaximumLength(100).WithMessage("Password cannot be longer than 100 characters.")
                .Matches(@"^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$")
                .WithMessage("Password must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol.");
        }
    }
}
