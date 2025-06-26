using Backend.Contracts.Wizard;
using FluentValidation;

namespace Backend.Application.Validators.WizardValidation
{
    /* ---------- Sub-validator ---------- */
    public sealed class SavingsGoalValidator : AbstractValidator<SavingsGoal>
    {
        public SavingsGoalValidator()
        {
            RuleFor(g => g.Name)
                .NotEmpty();

            RuleFor(g => g.TargetAmount)
                .NotNull()
                .GreaterThan(0);

            RuleFor(g => g.TargetDate)
                .NotNull()
                .GreaterThanOrEqualTo(DateTime.Today)
                .LessThanOrEqualTo(DateTime.Today.AddYears(40));

            RuleFor(g => g.AmountSaved)
                .GreaterThanOrEqualTo(0)
                .When(g => g.AmountSaved.HasValue);
        }
    }

    /* ---------- Root validator ---------- */
    public sealed class SavingsValidator : AbstractValidator<SavingsFormValues>
    {
        public SavingsValidator()
        {
            RuleFor(x => x.SavingHabit)
                .NotEmpty();

            RuleFor(x => x.MonthlySavings)
                .NotNull()
                .GreaterThan(0);

            RuleFor(x => x.SavingMethods)
                .NotNull()
                .Must(list => list!.Count > 0)
                .WithMessage("At least one saving method must be chosen.");


            When(x => x.Goals is not null, () =>
            {
                RuleForEach(x => x.Goals!)
                    .SetValidator(new SavingsGoalValidator());
            });
        }
    }

}
