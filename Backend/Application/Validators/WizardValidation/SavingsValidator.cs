using Backend.Application.Models.Wizard;
using FluentValidation;

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
        private const decimal MaxMonthlySavings = 1_000_000m;

        public SavingHabitsValidator()
        {
            RuleFor(h => h.MonthlySavings)
                .NotNull().WithMessage("Please enter the amount you save.")
                .GreaterThanOrEqualTo(0).WithMessage("The savings amount must be 0 or greater.")
                .LessThanOrEqualTo(MaxMonthlySavings).WithMessage("The savings amount is too high.");

            When(h => (h.MonthlySavings ?? 0) > 0, () =>
            {
                RuleFor(h => h.SavingMethods)
                    .NotNull().WithMessage("Please choose at least one saving method.")
                    .NotEmpty().WithMessage("Please choose at least one saving method (or prefer not).");

                RuleForEach(h => h.SavingMethods!)
                    .IsInEnum()
                    .WithMessage("Invalid saving method.");

                // preferNot must be exclusive.
                RuleFor(h => h.SavingMethods!)
                    .Must(list =>
                        !list.Contains(SavingMethod.PreferNot) || list.Count == 1
                    )
                    .WithMessage("'preferNot' cannot be combined with other methods.");

                // ✅ optional: prevent duplicates (nice-to-have)
                RuleFor(h => h.SavingMethods!)
                    .Must(list => list.Distinct().Count() == list.Count)
                    .WithMessage("Duplicate saving methods are not allowed.");
            });

            When(h => (h.MonthlySavings ?? 0) <= 0, () =>
            {
                // ✅ savings=0 => methods must be empty
                RuleFor(h => h.SavingMethods)
                    .Must(list => list == null || list.Count == 0)
                    .WithMessage("Saving methods must be empty when monthly savings is 0.");
            });
        }
    }


    // This sub-validator for a single goal remains perfect.
    public sealed class SavingsGoalValidator : AbstractValidator<SavingsGoal>
    {
        private const decimal MaxTarget = 100_000_000m;
        private const decimal MaxSaved = 100_000_000m;
        private const int MaxYearsInFuture = 40;
        public SavingsGoalValidator()
        {
            RuleFor(g => g.Id)
                .NotEmpty()
                .WithMessage("Goal must have a unique ID.");

            RuleFor(g => g.Name)
                .NotEmpty()
                .WithMessage("Goal must have a name.");

            // TargetAmount: required, integer, 1..MAX_TARGET
            RuleFor(g => g.TargetAmount)
                .NotNull().WithMessage("Goal amount is required.")
                .GreaterThan(0).WithMessage("Goal amount must be greater than 0.")
                .LessThanOrEqualTo(MaxTarget).WithMessage($"Goal amount must be <= {MaxTarget:N0}.")
                .Must(HaveAtMostTwoDecimals)
                    .WithMessage("Target amount can have at most 2 decimal places.");

            // TargetDate: >= today, <= today+40y
            RuleFor(g => g.TargetDate)
                .NotNull().WithMessage("Target date is required.")
                .Must(BeOnOrAfterTodayUtc).WithMessage("Target date cannot be in the past.")
                .Must(BeWithinMaxFutureUtc).WithMessage($"Target date cannot be more than {MaxYearsInFuture} years in the future.");

            // AmountSaved: optional, integer, 0..MAX_SAVED
            RuleFor(g => g.AmountSaved)
                .GreaterThanOrEqualTo(0).WithMessage("Amount saved must be 0 or greater.")
                .LessThanOrEqualTo(MaxSaved).WithMessage($"Amount saved must be <= {MaxSaved:N0}.")
                .Must(v => v == null || HaveAtMostTwoDecimals(v.Value))
                .WithMessage("Amount saved can have at most 2 decimal places.")
                .When(g => g.AmountSaved.HasValue);

            // AmountSaved <= TargetAmount (when both exist)
            RuleFor(g => g)
                .Must(g =>
                {
                    if (!g.AmountSaved.HasValue) return true;
                    if (!g.TargetAmount.HasValue) return true;
                    return g.AmountSaved.Value <= g.TargetAmount.Value;
                })
                .WithMessage("Amount saved cannot be greater than target amount.");
        }
        private static bool HaveAtMostTwoDecimals(decimal value) =>
            decimal.Round(value, 2) == value;

        private static bool HaveAtMostTwoDecimals(decimal? value) =>
            !value.HasValue || HaveAtMostTwoDecimals(value.Value);

        private static bool BeWholeKrona(decimal? v) =>
            v.HasValue && v.Value == decimal.Truncate(v.Value);

        private static bool BeWholeKrona(decimal v) =>
            v == decimal.Truncate(v);

        private static bool BeOnOrAfterTodayUtc(DateTime? dt)
        {
            if (!dt.HasValue) return false;
            var todayUtc = DateTime.UtcNow.Date;
            return dt.Value.Date >= todayUtc;
        }

        private static bool BeWithinMaxFutureUtc(DateTime? dt)
        {
            if (!dt.HasValue) return false;
            var max = DateTime.UtcNow.Date.AddYears(MaxYearsInFuture);
            return dt.Value.Date <= max;
        }
    }

    // The main validator that orchestrates the sub-validators
    public sealed class SavingsValidator : AbstractValidator<SavingsFormValues>
    {
        public SavingsValidator()
        {
            When(x => x.Intro != null, () =>
            {
                RuleFor(x => x.Intro!).SetValidator(new SavingsIntroValidator());
            });

            When(x => x.Habits != null, () =>
            {
                RuleFor(x => x.Habits!).SetValidator(new SavingHabitsValidator());
            });

            When(x => x.Goals != null && x.Goals.Any(), () =>
            {
                RuleForEach(x => x.Goals!).SetValidator(new SavingsGoalValidator());
                RuleFor(x => x.Goals)
                    .Must(goals => goals!.Select(g => g.Id).Distinct().Count() == goals!.Count())
                    .WithMessage("Found duplicate goal IDs. Please ensure all goals have a unique ID.");
                RuleFor(x => x.Goals)
                    .Must(goals => goals!.Count(g => g.IsFavorite) <= 1)
                    .WithMessage("Only one savings goal can be marked as favorite.");
            });
        }
    }

}
