using Backend.Domain.Entities.Budget.Savings;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.AddSavingsMethod;

public sealed class AddSavingsMethodCommandValidator
    : AbstractValidator<AddSavingsMethodCommand>
{
    public const int MaxCustomLabelLength = 120;

    public AddSavingsMethodCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.Code)
            .NotEmpty()
            .Must(SavingsMethodCodes.IsKnown)
            .WithMessage("Code must be one of the known savings method codes.");

        When(x => SavingsMethodCodes.IsCustom(x.Code), () =>
        {
            RuleFor(x => x.CustomLabel)
                .Cascade(CascadeMode.Stop)
                .NotNull().WithMessage("CustomLabel is required for custom methods.")
                .Must(label => !string.IsNullOrWhiteSpace(label))
                    .WithMessage("CustomLabel cannot be blank.")
                .Must(label => label!.Trim().Length <= MaxCustomLabelLength)
                    .WithMessage($"CustomLabel cannot exceed {MaxCustomLabelLength} characters.");
        });

        When(x => !SavingsMethodCodes.IsCustom(x.Code), () =>
        {
            RuleFor(x => x.CustomLabel)
                .Must(label => label is null)
                .WithMessage("CustomLabel must be null for system method codes.");
        });
    }
}
