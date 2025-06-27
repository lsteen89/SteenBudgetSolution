using Backend.Contracts.Wizard;
using FluentValidation;
using System;
using System.Linq;

namespace Backend.Application.Validators.WizardValidation
{
    // This sub-validator for a single goal remains perfect. It will be used by the Goals validator.
    public sealed class SavingsGoalValidator : AbstractValidator<SavingsGoal>
    {
        public SavingsGoalValidator()
        {
            RuleFor(g => g.Id).NotEmpty().WithMessage("Goal must have a unique ID.");
            RuleFor(g => g.Name).NotEmpty().WithMessage("Goal must have a name.");
            RuleFor(g => g.Amount).NotNull().GreaterThan(0).WithMessage("Goal amount must be greater than 0.");
            RuleFor(g => g.TargetDate).NotNull().GreaterThan(DateTime.UtcNow.Date).WithMessage("Target date cannot be in the past.");
            RuleFor(g => g.AmountSaved).GreaterThanOrEqualTo(0).When(g => g.AmountSaved.HasValue);
        }
    }


    public sealed class SavingHabitValidator : AbstractValidator<SavingsFormValues>
    {
        public SavingHabitValidator()
        {
            RuleFor(x => x.SavingHabit)
                .NotEmpty().WithMessage("You must specify your saving habit.");
        }
    }


    public sealed class SavingMethodsValidator : AbstractValidator<SavingsFormValues>
    {
        public SavingMethodsValidator()
        {
            var activeSavingHabits = new[] { "regular", "sometimes" };
            When(x => !string.IsNullOrEmpty(x.SavingHabit) && activeSavingHabits.Contains(x.SavingHabit), () =>
            {
                RuleFor(x => x.MonthlySavings)
                    .NotNull().WithMessage("Please enter the amount you save.")
                    .GreaterThan(0).WithMessage("The savings amount must be greater than 0.");

                RuleFor(x => x.SavingMethods)
                    .NotEmpty().WithMessage("Please choose at least one saving method.");
            });
        }
    }


    public sealed class SavingGoalsValidator : AbstractValidator<SavingsFormValues>
    {
        public SavingGoalsValidator()
        {
            When(x => x.Goals != null && x.Goals.Any(), () =>
            {
                RuleForEach(x => x.Goals)
                    .SetValidator(new SavingsGoalValidator());
            });
        }
    }


    public sealed class SavingsValidator : AbstractValidator<SavingsFormValues>
    {
        public SavingsValidator()
        {
            Include(new SavingHabitValidator());
            Include(new SavingMethodsValidator());
            Include(new SavingGoalsValidator());
        }
    }
}