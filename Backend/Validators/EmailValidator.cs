using FluentValidation;
using Backend.DTO;

namespace Backend.Validators
{
    public class EmailValidator : AbstractValidator<SendEmailDto>
    {
        public EmailValidator() 
        { 
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .Matches("^[a-zA-Z]{1,20}$").WithMessage("First name must contain only letters and be 1 to 20 characters long.")
                .MaximumLength(20).WithMessage("First name cannot be longer than 20 characters.");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .Matches("^[a-zA-Z]{1,20}$").WithMessage("Last name must contain only letters and be 1 to 20 characters long.")
                .MaximumLength(20).WithMessage("Last name cannot be longer than 20 characters.");

            RuleFor(x => x.subject)
                .NotEmpty().WithMessage("Subject is required.")
                .Matches("^[a-zA-Z]{1,50}$").WithMessage("Subject must contain only letters and be 1 to 50 characters long.")
                .MaximumLength(50).WithMessage("Subject cannot be longer than 50 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .Matches(@"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$").WithMessage("Invalid email format.");

            RuleFor(x => x.Token)
                .NotEmpty().WithMessage("Token is required.");

        }
    }
}
