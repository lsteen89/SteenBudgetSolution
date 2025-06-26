using Backend.Contracts.Wizard;
using FluentValidation;
using Org.BouncyCastle.Crypto;

public sealed class IncomeValidator : AbstractValidator<IncomeFormValues>
{
    public IncomeValidator()
    {
        /* ── scalar rules ─────────────────────────── */
        RuleFor(x => x.NetSalary)
            .NotNull()
            .GreaterThan(0).WithMessage("Net salary must be greater than 0.");

        RuleFor(x => x.SalaryFrequency)
            .IsInEnum().WithMessage("Salary frequency is required.");

        /* ── household members ────────────────────── */
        When(x => x.ShowHouseholdMembers == true, () =>
        {
            RuleFor(x => x.HouseholdMembers)
                .NotNull()
                .Must(h => h.Count > 0)
                .WithMessage("At least one household member must be added.");

            RuleForEach(x => x.HouseholdMembers!)
                .ChildRules(m =>
                {
                    m.RuleFor(h => h.Name)
                        .NotEmpty().WithMessage("Name is required.");

                    m.RuleFor(h => h.Income)
                        .NotNull().WithMessage("Income is required.")
                        .GreaterThan(0).WithMessage("Income must be > 0.");

                    m.RuleFor(h => h.Frequency)
                        .IsInEnum().WithMessage("Frequency is required.");
                });
        });

        /* ── side hustles ─────────────────────────── */
        When(x => x.ShowSideIncome == true, () =>
        {
            RuleFor(x => x.SideHustles)
                .NotNull()
                .Must(s => s.Count > 0)
                .WithMessage("At least one side hustle must be added.");

            RuleForEach(x => x.SideHustles!)
                .ChildRules(s =>
                {
                    s.RuleFor(h => h.Name)
                        .NotEmpty().WithMessage("Side hustle name is required.");

                    s.RuleFor(h => h.Income)
                        .NotNull().WithMessage("Side hustle income is required.")
                        .GreaterThan(0).WithMessage("Income must be > 0.");

                    s.RuleFor(h => h.Frequency)
                        .IsInEnum().WithMessage("Frequency is required.");
                });
        });
    }
}
