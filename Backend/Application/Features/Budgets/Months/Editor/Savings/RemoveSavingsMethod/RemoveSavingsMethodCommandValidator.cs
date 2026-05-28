using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsMethod;

public sealed class RemoveSavingsMethodCommandValidator
    : AbstractValidator<RemoveSavingsMethodCommand>
{
    public RemoveSavingsMethodCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.SavingsMethodId)
            .NotEmpty();
    }
}
