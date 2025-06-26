using Backend.Contracts.Wizard;
using FluentValidation;

/* ───────────────── sub-validators ───────────────── */

public sealed class RentValidator : AbstractValidator<Rent>
{
    public RentValidator()
    {
        RuleFor(r => r.HomeType).NotEmpty();

        RuleFor(r => r.MonthlyRent)
            .NotNull().GreaterThan(0)
            .When(r => r.HomeType == "rent");

        RuleFor(r => r.MonthlyFee)
            .NotNull().GreaterThan(0)
            .When(r => r.HomeType == "brf");

        RuleFor(r => r.MortgagePayment)
            .NotNull().GreaterThan(0)
            .When(r => r.HomeType == "house");

        RuleFor(r => r.RentExtraFees)
            .GreaterThanOrEqualTo(0)
            .When(r => r.RentExtraFees.HasValue);

        RuleFor(r => r.BrfExtraFees)
            .GreaterThanOrEqualTo(0)
            .When(r => r.BrfExtraFees.HasValue);

        RuleFor(r => r.HouseotherCosts)
            .GreaterThanOrEqualTo(0)
            .When(r => r.HouseotherCosts.HasValue);

        RuleFor(r => r.OtherCosts)
            .GreaterThanOrEqualTo(0)
            .When(r => r.OtherCosts.HasValue);
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

public sealed class UtilitiesValidator : AbstractValidator<Utilities>
{
    public UtilitiesValidator()
    {
        RuleFor(u => u.Electricity)
            .GreaterThanOrEqualTo(0)
            .When(u => u.Electricity.HasValue);

        RuleFor(u => u.Water)
            .GreaterThanOrEqualTo(0)
            .When(u => u.Water.HasValue);
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
            .NotEmpty()
            .MinimumLength(2);

        RuleFor(f => f.Amount)
            .NotNull()
            .GreaterThan(0);
    }
}

public sealed class SubscriptionItemValidator : AbstractValidator<SubscriptionItem>
{
    public SubscriptionItemValidator()
    {
        RuleFor(s => s.Name)
            .NotEmpty()
            .MinimumLength(2);

        RuleFor(s => s.Fee)
            .NotNull()
            .GreaterThan(0);
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
                .SetValidator(new SubscriptionItemValidator());
        });
    }
}

/* ───────────────── root ­validator ───────────────── */

public sealed class ExpenditureValidator : AbstractValidator<ExpenditureFormValues>
{
    public ExpenditureValidator()
    {
        When(x => x.Rent is not null,
            () => RuleFor(x => x.Rent!).SetValidator(new RentValidator()));

        When(x => x.Food is not null,
            () => RuleFor(x => x.Food!).SetValidator(new FoodValidator()));

        When(x => x.Utilities is not null,
            () => RuleFor(x => x.Utilities!).SetValidator(new UtilitiesValidator()));

        When(x => x.Transport is not null,
            () => RuleFor(x => x.Transport!).SetValidator(new TransportValidator()));

        When(x => x.Clothing is not null,
            () => RuleFor(x => x.Clothing!).SetValidator(new ClothingValidator()));

        When(x => x.FixedExpenses is not null,
            () => RuleFor(x => x.FixedExpenses!).SetValidator(new FixedExpenseItemValidator()));

        When(x => x.Subscriptions is not null,
            () => RuleFor(x => x.Subscriptions!).SetValidator(new SubscriptionsValidator()));
    }
}
