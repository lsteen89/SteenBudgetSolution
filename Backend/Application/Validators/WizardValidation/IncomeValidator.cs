using Backend.Application.Models.Wizard;
using FluentValidation;

public sealed class IncomeValidator : AbstractValidator<IncomeFormValues>
{
    private static readonly string[] ValidIncomePaymentDayTypes = ["dayOfMonth", "lastDayOfMonth"];

    public IncomeValidator()
    {
        RuleFor(x => x.NetSalary)
            .NotNull().WithMessage("Ange din primära inkomst.")
            .GreaterThan(0).WithMessage("Inkomsten måste vara > 0.");

        RuleFor(x => x.SalaryFrequency)
            .IsInEnum().WithMessage("Välj frekvens.");

        RuleForEach(x => x.HouseholdMembers)
            .SetValidator(new IncomeItemValidator());

        RuleForEach(x => x.SideHustles)
            .SetValidator(new IncomeItemValidator());

        RuleFor(x => x)
            .Custom((x, ctx) =>
            {
                var paymentDayType = x.IncomePaymentDayType;
                var paymentDay = x.IncomePaymentDay;

                if (paymentDayType is null && paymentDay is null)
                    return;

                if (paymentDayType is null)
                {
                    ctx.AddFailure(nameof(x.IncomePaymentDayType), "Välj när du vanligtvis får lön.");
                    return;
                }

                if (!ValidIncomePaymentDayTypes.Contains(paymentDayType))
                {
                    ctx.AddFailure(nameof(x.IncomePaymentDayType), "Ogiltigt löneutbetalningsdatum.");
                    return;
                }

                if (paymentDayType == "dayOfMonth")
                {
                    if (!paymentDay.HasValue)
                    {
                        ctx.AddFailure(nameof(x.IncomePaymentDay), "Välj en dag i månaden.");
                        return;
                    }

                    if (paymentDay is < 1 or > 28)
                    {
                        ctx.AddFailure(nameof(x.IncomePaymentDay), "Välj en dag mellan 1 och 28.");
                    }

                    return;
                }

                if (paymentDay.HasValue)
                {
                    ctx.AddFailure(nameof(x.IncomePaymentDay), "Dag i månaden ska vara tomt när sista dagen är vald.");
                }
            });

        RuleFor(x => x.HouseholdMembers)
            .Must(HaveUniqueIds)
            .WithMessage("Duplicate household-member IDs are not allowed.");

        RuleFor(x => x.SideHustles)
            .Must(HaveUniqueIds)
            .WithMessage("Duplicate side-hustle IDs are not allowed.");
    }

    private static bool HaveUniqueIds(List<IncomeItem> items)
    {
        var ids = items
            .Where(x => !string.IsNullOrWhiteSpace(x.Id))
            .Select(x => x.Id!)
            .ToList();

        return ids.Distinct().Count() == ids.Count;
    }
}

public sealed class IncomeItemValidator : AbstractValidator<IncomeItem>
{
    public IncomeItemValidator()
    {
        RuleFor(x => x).Custom((x, ctx) =>
        {
            var hasName = !string.IsNullOrWhiteSpace(x.Name);
            var hasIncome = x.Income.HasValue;
            var hasFreq = x.Frequency.HasValue;

            // Empty row OK
            if (!hasName && !hasIncome && !hasFreq)
                return;

            // income must be > 0
            if (hasIncome && x.Income <= 0)
                ctx.AddFailure(nameof(x.Income), "Beloppet måste vara > 0 kr.");

            //  min length 2
            if (hasName && x.Name!.Trim().Length < 2)
                ctx.AddFailure(nameof(x.Name), "Minst 2 tecken.");

            //  require all fields if any are present
            if (!hasName)
                ctx.AddFailure(nameof(x.Name), "Ange ett namn.");

            if (!hasIncome)
                ctx.AddFailure(nameof(x.Income), "Ange ett belopp (> 0 kr).");

            if (!hasFreq)
                ctx.AddFailure(nameof(x.Frequency), "Välj frekvens.");
        });
    }
}
