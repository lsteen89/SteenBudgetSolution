using FluentValidation;
using Backend.Application.DTO.Email;

namespace Backend.Application.Validators
{
    public class EmailValidator : AbstractValidator<SendEmailDto>
    {
        public EmailValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("Förnamn är obligatoriskt.")
                .MaximumLength(20).WithMessage("Förnamn får inte vara längre än 20 tecken.");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Efternamn är obligatoriskt.")
                .MaximumLength(20).WithMessage("Efternamn får inte vara längre än 20 tecken.");

            RuleFor(x => x.subject)
                .NotEmpty().WithMessage("Ämne är obligatoriskt.")
                .MaximumLength(50).WithMessage("Ämne får inte vara längre än 50 tecken.");

            RuleFor(x => x.body)
                .NotEmpty().WithMessage("Meddelande är obligatoriskt.")
                .MaximumLength(500).WithMessage("Meddelande får inte vara längre än 500 tecken.")
                .MinimumLength(10).WithMessage("Meddelande måste vara minst 10 tecken långt.");

            RuleFor(x => x.SenderEmail)
                .NotEmpty().WithMessage("E-postadress är obligatorisk.")
                .EmailAddress().WithMessage("Ogiltig e-postadress.")
                .MaximumLength(254).WithMessage("E-postadress får inte vara längre än 254 tecken.");

            RuleFor(x => x.CaptchaToken)
                .NotEmpty().WithMessage("Felaktig reCaptcha.")
                .When(x => x.SenderEmail != "l@l.se", ApplyConditionTo.CurrentValidator);
            // Skip reCaptcha validation for the email "l@l.se"
            // TODO REMOVE IT IN PRODUCTION

        }
    }
}
