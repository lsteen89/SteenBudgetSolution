using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.CloseBudgetMonth;

public sealed class CloseBudgetMonthCommandValidator : AbstractValidator<CloseBudgetMonthCommand>
{
    public CloseBudgetMonthCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.ActorPersoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.Request)
            .NotNull();

        When(x => x.Request is not null, () =>
        {
            RuleFor(x => x.Request.CarryOverMode)
                .NotEmpty()
                .Must(mode =>
                {
                    var normalized = mode?.Trim();
                    return normalized is BudgetMonthCarryOverModes.None
                        or BudgetMonthCarryOverModes.Full;
                })
                .WithMessage("CarryOverMode must be none|full.");
        });
    }
}
