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
        RuleFor(t => t.FuelOrCharging)
            .GreaterThanOrEqualTo(0).When(t => t.FuelOrCharging.HasValue)
            .LessThanOrEqualTo(20_000).When(t => t.FuelOrCharging.HasValue);

        RuleFor(t => t.CarInsurance)
            .GreaterThanOrEqualTo(0).When(t => t.CarInsurance.HasValue)
            .LessThanOrEqualTo(20_000).When(t => t.CarInsurance.HasValue);

        RuleFor(t => t.ParkingFee)
            .GreaterThanOrEqualTo(0).When(t => t.ParkingFee.HasValue)
            .LessThanOrEqualTo(20_000).When(t => t.ParkingFee.HasValue);

        RuleFor(t => t.OtherCarCosts)
            .GreaterThanOrEqualTo(0).When(t => t.OtherCarCosts.HasValue)
            .LessThanOrEqualTo(50_000).When(t => t.OtherCarCosts.HasValue);

        RuleFor(t => t.PublicTransit)
            .GreaterThanOrEqualTo(0).When(t => t.PublicTransit.HasValue)
            .LessThanOrEqualTo(20_000).When(t => t.PublicTransit.HasValue);
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
        RuleFor(x => x).Custom((item, ctx) =>
        {
            var name = item.Name?.Trim();
            var hasName = !string.IsNullOrWhiteSpace(name);
            var hasCost = item.Cost.HasValue;

            // 1) Empty row is OK
            if (!hasName && !hasCost) return;

            // 2) If cost entered -> must be > 0
            if (hasCost && item.Cost!.Value <= 0)
                ctx.AddFailure("cost", "Beloppet måste vara > 0 kr.");

            // 3) If name entered -> must be >= 2 chars
            if (hasName && name!.Length < 2)
                ctx.AddFailure("name", "Minst 2 tecken.");

            // 4) If either is entered, require the other
            if (hasName && !hasCost)
                ctx.AddFailure("cost", "Ange ett belopp (> 0 kr).");

            if (hasCost && !hasName)
                ctx.AddFailure("name", "Ange ett namn på utgiften.");
        });
    }
}

public sealed class FixedExpensesValidator : AbstractValidator<FixedExpensesSubForm>
{
    public FixedExpensesValidator()
    {
        // Standard nullable fields
        RuleFor(x => x.Electricity).GreaterThanOrEqualTo(0).When(x => x.Electricity.HasValue);
        RuleFor(x => x.Insurance).GreaterThanOrEqualTo(0).When(x => x.Insurance.HasValue);
        RuleFor(x => x.Internet).GreaterThanOrEqualTo(0).When(x => x.Internet.HasValue);
        RuleFor(x => x.Phone).GreaterThanOrEqualTo(0).When(x => x.Phone.HasValue);
        RuleFor(x => x.Gym).GreaterThanOrEqualTo(0).When(x => x.Gym.HasValue);

        // Custom items (allow empty rows via item validator)
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
        RuleFor(x => x)
            .Custom((item, context) =>
            {
                if (item is null) return;

                var name = item.Name?.Trim();
                var cost = item.Cost;

                var hasName = !string.IsNullOrWhiteSpace(name);
                var hasCost = cost.HasValue;

                // 1) Empty row is OK
                if (!hasName && !hasCost) return;

                // 2) If cost entered -> must be > 0
                if (hasCost && cost!.Value <= 0)
                {
                    context.AddFailure(nameof(item.Cost), "Beloppet måste vara > 0 kr.");
                    return;
                }

                // 3) If name entered -> must be at least 2 chars
                if (hasName && name!.Length < 2)
                {
                    context.AddFailure(nameof(item.Name), "Minst 2 tecken.");
                    return;
                }

                // 4) Require both once user started
                if (hasName && !hasCost)
                {
                    context.AddFailure(nameof(item.Cost), "Ange ett belopp (> 0 kr).");
                    return;
                }

                if (hasCost && !hasName)
                {
                    context.AddFailure(nameof(item.Name), "Ange ett namn.");
                    return;
                }
            });
    }
}

public sealed class SubscriptionsValidator : AbstractValidator<SubscriptionsSubForm>
{
    public SubscriptionsValidator()
    {
        RuleFor(x => x.Netflix)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Netflix.HasValue);

        RuleFor(x => x.Spotify)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Spotify.HasValue);

        RuleFor(x => x.HBOMax)
            .GreaterThanOrEqualTo(0)
            .When(x => x.HBOMax.HasValue);

        RuleFor(x => x.Viaplay)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Viaplay.HasValue);

        RuleFor(x => x.DisneyPlus)
            .GreaterThanOrEqualTo(0)
            .When(x => x.DisneyPlus.HasValue);

        RuleForEach(x => x.CustomSubscriptions)
            .SetValidator(new SubscriptionItemValidator());
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
