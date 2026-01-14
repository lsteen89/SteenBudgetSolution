using Backend.Application.Models.Wizard;
using FluentValidation;

/* ───────────────── sub-validators ───────────────── */

public sealed class HousingValidator : AbstractValidator<Housing>
{
    private static readonly string[] AllowedHomeTypes = ["rent", "brf", "house", "free"];

    public HousingValidator()
    {
        RuleFor(x => x.HomeType)
            .NotEmpty()
            .Must(t => AllowedHomeTypes.Contains(t!))
            .WithMessage("Invalid homeType.");

        // Validate nested objects only if present
        When(x => x.Payment is not null, () =>
        {
            RuleFor(x => x.Payment!).SetValidator(new HousingPaymentValidator());
        });

        When(x => x.RunningCosts is not null, () =>
        {
            RuleFor(x => x.RunningCosts!).SetValidator(new HousingRunningCostsValidator());
        });

        // Conditional required fields (based on HomeType)
        RuleFor(x => x.Payment!.MonthlyRent)
            .NotNull().GreaterThan(0)
            .WithMessage("monthlyRent must be > 0 for rent.")
            .When(x => x.HomeType == "rent")
            // ensure Payment exists when needed
            .DependentRules(() =>
            {
                RuleFor(x => x.Payment).NotNull().WithMessage("payment is required for rent.");
            });

        RuleFor(x => x.Payment!.MonthlyFee)
            .NotNull().GreaterThan(0)
            .WithMessage("monthlyFee must be > 0 for brf.")
            .When(x => x.HomeType == "brf")
            .DependentRules(() =>
            {
                RuleFor(x => x.Payment).NotNull().WithMessage("payment is required for brf.");
            });

        // OPTIONAL caps mirroring FE
        RuleFor(x => x.Payment!.MonthlyRent)
            .LessThanOrEqualTo(50000)
            .When(x => x.Payment?.MonthlyRent is not null);

        RuleFor(x => x.Payment!.MonthlyFee)
            .LessThanOrEqualTo(50000)
            .When(x => x.Payment?.MonthlyFee is not null);

        RuleFor(x => x.Payment!.ExtraFees)
            .LessThanOrEqualTo(50000)
            .When(x => x.Payment?.ExtraFees is not null);
    }
}

public sealed class HousingPaymentValidator : AbstractValidator<HousingPayment>
{
    public HousingPaymentValidator()
    {
        RuleFor(x => x.MonthlyRent)
            .GreaterThanOrEqualTo(0).When(x => x.MonthlyRent.HasValue);

        RuleFor(x => x.MonthlyFee)
            .GreaterThanOrEqualTo(0).When(x => x.MonthlyFee.HasValue);

        RuleFor(x => x.ExtraFees)
            .GreaterThanOrEqualTo(0).When(x => x.ExtraFees.HasValue);
    }
}

public sealed class HousingRunningCostsValidator : AbstractValidator<HousingRunningCosts>
{
    public HousingRunningCostsValidator()
    {
        RuleFor(x => x.Electricity).GreaterThanOrEqualTo(0).When(x => x.Electricity.HasValue);
        RuleFor(x => x.Heating).GreaterThanOrEqualTo(0).When(x => x.Heating.HasValue);
        RuleFor(x => x.Water).GreaterThanOrEqualTo(0).When(x => x.Water.HasValue);
        RuleFor(x => x.Waste).GreaterThanOrEqualTo(0).When(x => x.Waste.HasValue);
        RuleFor(x => x.Other).GreaterThanOrEqualTo(0).When(x => x.Other.HasValue);

        // OPTIONAL caps mirroring FE
        RuleFor(x => x.Electricity).LessThanOrEqualTo(20000).When(x => x.Electricity.HasValue);
        RuleFor(x => x.Heating).LessThanOrEqualTo(20000).When(x => x.Heating.HasValue);
        RuleFor(x => x.Water).LessThanOrEqualTo(20000).When(x => x.Water.HasValue);
        RuleFor(x => x.Waste).LessThanOrEqualTo(20000).When(x => x.Waste.HasValue);
        RuleFor(x => x.Other).LessThanOrEqualTo(50000).When(x => x.Other.HasValue);
    }
}

public sealed class FoodValidator : AbstractValidator<Food>
{
    public FoodValidator()
    {
        RuleFor(f => f.FoodStoreExpenses)
            .GreaterThanOrEqualTo(0)
            .When(f => f.FoodStoreExpenses.HasValue);

        RuleFor(f => f.TakeoutExpenses)
            .GreaterThanOrEqualTo(0)
            .When(f => f.TakeoutExpenses.HasValue);
    }
}

public sealed class TransportValidator : AbstractValidator<Transport>
{
    public TransportValidator()
    {
        RuleFor(t => t.MonthlyFuelCost)
            .GreaterThanOrEqualTo(0)
            .When(t => t.MonthlyFuelCost.HasValue);

        RuleFor(t => t.MonthlyInsuranceCost)
            .GreaterThanOrEqualTo(0)
            .When(t => t.MonthlyInsuranceCost.HasValue);

        RuleFor(t => t.MonthlyTotalCarCost)
            .GreaterThanOrEqualTo(0)
            .When(t => t.MonthlyTotalCarCost.HasValue);

        RuleFor(t => t.MonthlyTransitCost)
            .GreaterThanOrEqualTo(0)
            .When(t => t.MonthlyTransitCost.HasValue);
    }
}

public sealed class ClothingValidator : AbstractValidator<Clothing>
{
    public ClothingValidator()
    {
        RuleFor(c => c.MonthlyClothingCost)
            .GreaterThanOrEqualTo(0)
            .When(c => c.MonthlyClothingCost.HasValue);
    }
}

public sealed class FixedExpenseItemValidator : AbstractValidator<FixedExpenseItem>
{
    public FixedExpenseItemValidator()
    {
        RuleFor(f => f.Name)
            .NotEmpty().WithMessage("Ange namn på utgiften.")
            .MinimumLength(2).WithMessage("Minst 2 tecken.");

        RuleFor(f => f.Cost)
            .NotNull().WithMessage("Ange kostnaden.")
            .GreaterThan(0).WithMessage("Beloppet måste vara > 0 kr.");
    }
}

public sealed class FixedExpensesValidator : AbstractValidator<FixedExpensesSubForm>
{
    public FixedExpensesValidator()
    {
        // Rules for the standard, nullable fields
        RuleFor(x => x.Electricity).GreaterThanOrEqualTo(0).When(x => x.Electricity.HasValue);
        RuleFor(x => x.Insurance).GreaterThanOrEqualTo(0).When(x => x.Insurance.HasValue);
        RuleFor(x => x.Internet).GreaterThanOrEqualTo(0).When(x => x.Internet.HasValue);
        RuleFor(x => x.Phone).GreaterThanOrEqualTo(0).When(x => x.Phone.HasValue);
        RuleFor(x => x.UnionFees).GreaterThanOrEqualTo(0).When(x => x.UnionFees.HasValue);

        When(x => x.CustomExpenses is not null, () =>
        {
            RuleForEach(x => x.CustomExpenses!)
                .SetValidator(new FixedExpenseItemValidator());
        });
    }
}

public sealed class SubscriptionItemValidator : AbstractValidator<SubscriptionItem?>
{
    public SubscriptionItemValidator()
    {
        // Rules for the subscription item
        When(s => s is not null, () =>
        {
            RuleFor(s => s!.Name)
                .NotEmpty()
                .MinimumLength(2);

            RuleFor(s => s!.Cost)
                .NotNull()
                .GreaterThan(0);
        });
    }
}

public sealed class SubscriptionsValidator : AbstractValidator<SubscriptionsSubForm>
{
    public SubscriptionsValidator()
    {
        RuleFor(s => s.Netflix)
            .GreaterThanOrEqualTo(0)
            .When(s => s.Netflix.HasValue);

        RuleFor(s => s.Spotify)
            .GreaterThanOrEqualTo(0)
            .When(s => s.Spotify.HasValue);

        RuleFor(s => s.HBOMax)
            .GreaterThanOrEqualTo(0)
            .When(s => s.HBOMax.HasValue);

        RuleFor(s => s.Viaplay)
            .GreaterThanOrEqualTo(0)
            .When(s => s.Viaplay.HasValue);

        RuleFor(s => s.DisneyPlus)
            .GreaterThanOrEqualTo(0)
            .When(s => s.DisneyPlus.HasValue);

        When(s => s.CustomSubscriptions is not null, () =>
        {
            RuleForEach(s => s.CustomSubscriptions!)
                .SetValidator((IValidator<SubscriptionItem?>)new SubscriptionItemValidator());
        });
    }
}

/* ───────────────── root ­validator ───────────────── */

public sealed class ExpenditureValidator : AbstractValidator<ExpenditureFormValues>
{
    public ExpenditureValidator()
    {
        When(x => x.Housing is not null,
            () => RuleFor(x => x.Housing!).SetValidator(new HousingValidator()));

        When(x => x.Food is not null,
            () => RuleFor(x => x.Food!).SetValidator(new FoodValidator()));

        When(x => x.Transport is not null,
            () => RuleFor(x => x.Transport!).SetValidator(new TransportValidator()));

        When(x => x.Clothing is not null,
            () => RuleFor(x => x.Clothing!).SetValidator(new ClothingValidator()));

        When(x => x.FixedExpenses is not null,
                    () => RuleFor(x => x.FixedExpenses!).SetValidator(new FixedExpensesValidator()));

        When(x => x.Subscriptions is not null,
            () => RuleFor(x => x.Subscriptions!).SetValidator(new SubscriptionsValidator()));
    }
}
