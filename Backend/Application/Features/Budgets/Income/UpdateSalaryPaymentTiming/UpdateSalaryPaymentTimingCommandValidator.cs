using FluentValidation;

namespace Backend.Application.Features.Budgets.Income.UpdateSalaryPaymentTiming;

public sealed class UpdateSalaryPaymentTimingCommandValidator
    : AbstractValidator<UpdateSalaryPaymentTimingCommand>
{
    public UpdateSalaryPaymentTimingCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Request)
            .NotNull();
    }
}
