using Backend.Application.Models.Wizard;
using FluentValidation;
using System.Linq;

namespace Backend.Application.Validators.WizardValidation
{
    // Validator for the "Intro" part of the savings form
    public sealed class SavingsIntroValidator : AbstractValidator<SavingsIntro>
    {
        public SavingsIntroValidator()
        {
            RuleFor(i => i.SavingHabit)
                .NotEmpty().WithMessage("You must specify your saving habit.");
        }
    }

    // Validator for the "Habits" part of the savings form
    public sealed class SavingHabitsValidator : AbstractValidator<SavingHabits>
    {
        public SavingHabitsValidator()
        {
            RuleFor(h => h.MonthlySavings)
                .NotNull().WithMessage("Please enter the amount you save.")
                .GreaterThan(0).WithMessage("The savings amount must be greater than 0.");

            RuleFor(h => h.SavingMethods)
                .NotEmpty().WithMessage("Please choose at least one saving method.");
        }
    }

    // This sub-validator for a single goal remains perfect.
    public sealed class SavingsGoalValidator : AbstractValidator<SavingsGoal>
    {
        public SavingsGoalValidator()
        {
            RuleFor(g => g.Id).NotEmpty().WithMessage("Goal must have a unique ID.");
            RuleFor(g => g.Name).NotEmpty().WithMessage("Goal must have a name.");
            RuleFor(g => g.TargetAmount).NotNull().GreaterThan(0).WithMessage("Goal amount must be greater than 0.");
            RuleFor(g => g.TargetDate).NotNull().GreaterThan(System.DateTime.UtcNow.Date).WithMessage("Target date cannot be in the past.");
            RuleFor(g => g.AmountSaved).GreaterThanOrEqualTo(0).When(g => g.AmountSaved.HasValue);
        }
    }

    // The main validator that orchestrates the sub-validators
    public sealed class SavingsValidator : AbstractValidator<SavingsFormValues>
    {
        public SavingsValidator()
        {
            When(x => x.Intro != null, () => {
                RuleFor(x => x.Intro).SetValidator(new SavingsIntroValidator());
            });

            When(x => x.Habits != null, () => {
                RuleFor(x => x.Habits).SetValidator(new SavingHabitsValidator());
            });

            When(x => x.Goals != null && x.Goals.Any(), () => {
                RuleForEach(x => x.Goals).SetValidator(new SavingsGoalValidator());
                RuleFor(x => x.Goals)
                    .Must(goals => goals.Select(g => g.Id).Distinct().Count() == goals.Count)
                    .WithMessage("Found duplicate goal IDs. Please ensure all goals have a unique ID.");
            });
        }
    }
}
