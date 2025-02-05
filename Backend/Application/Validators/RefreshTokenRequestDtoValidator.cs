using FluentValidation;
using Backend.Application.DTO;

namespace Backend.Application.Validators
{
    public class RefreshTokenRequestDtoValidator : AbstractValidator<RefreshTokenRequestDto>
    {
        public RefreshTokenRequestDtoValidator()
        {
            RuleFor(x => x.UserId)
                .NotEmpty().WithMessage("PersoId is required.")
                .Must(guid => guid != Guid.Empty).WithMessage("PersoId must be a valid GUID.");

            RuleFor(x => x.RefreshToken)
                .NotEmpty().WithMessage("Refresh token is required.");
        }
    }
}
