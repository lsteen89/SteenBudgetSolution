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

            RuleFor(g => g.Amount)
                .NotNull()
                .GreaterThan(0);
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


            RuleFor(x => x.Goals)
                .Must(g =>
                {
                    if (g is null) return true;                
                    var ids = g.Where(goal => !string.IsNullOrWhiteSpace(goal.Id))
                               .Select(goal => goal.Id!)
                               .ToList();
                    return ids.Distinct().Count() == ids.Count;
                })
                .WithMessage("Duplicate goal IDs are not allowed.");

            When(x => x.Goals is not null, () =>
            {
                RuleForEach(x => x.Goals!)
                    .SetValidator(new SavingsGoalValidator());
            });
        }
    }

}
