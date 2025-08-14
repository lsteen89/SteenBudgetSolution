using Backend.Application.Models.Wizard;
using FluentValidation;

public sealed class IncomeValidator : AbstractValidator<IncomeFormValues>
{
    public IncomeValidator()
    {
        /* ── scalar rules ─────────────────────────── */
        RuleFor(x => x.NetSalary)
            .GreaterThan(0).WithMessage("Net salary must be greater than 0.");

        RuleFor(x => x.SalaryFrequency)
            .IsInEnum().WithMessage("Salary frequency is required.");

        /* ── household members ────────────────────── */
        When(x => x.ShowHouseholdMembers == true, () =>
        {
            RuleFor(x => x.HouseholdMembers!)
                .NotNull()
                .Must(h => h.Count > 0)
                .WithMessage("At least one household member must be added.")
                .Must(h =>
                {
                    var ids = h.Where(m => !string.IsNullOrWhiteSpace(m!.Id))
                               .Select(m => m.Id!)
                               .ToList();
                    return ids.Distinct().Count() == ids.Count;
                })
                .WithMessage("Duplicate household-member IDs are not allowed.");

            RuleForEach(x => x.HouseholdMembers!)
                .ChildRules(m =>
                {
                    m.RuleFor(h => h.Name).NotEmpty().WithMessage("Name is required.");
                    m.RuleFor(h => h.Income).GreaterThan(0).WithMessage("Income must be > 0.");
                    m.RuleFor(h => h.Frequency).IsInEnum().WithMessage("Frequency is required.");
                });
        });

        /* ── side hustles ─────────────────────────── */
        When(x => x.ShowSideIncome == true, () =>
        {
            RuleFor(x => x.SideHustles!)
                .NotNull()
                .Must(s => s.Count > 0)
                .WithMessage("At least one side hustle must be added.")
                .Must(h =>
                {
                    var ids = h.Where(m => !string.IsNullOrWhiteSpace(m.Id))
                                  .Select(m => m.Id!)
                                  .ToList();
                    return ids.Distinct().Count() == ids.Count;
                })
               .WithMessage("Duplicate side-hustle IDs are not allowed.");

            RuleForEach(x => x.SideHustles!)
                .ChildRules(s =>
                {
                    s.RuleFor(h => h.Name)
                        .NotEmpty().WithMessage("Side hustle name is required.");

                    s.RuleFor(h => h.Income)
                        .GreaterThan(0).WithMessage("Income must be > 0.");

                    s.RuleFor(h => h.Frequency)
                        .IsInEnum().WithMessage("Frequency is required.");
                });
        });

        When(x => x.ShowSideIncome != true, () =>
        {
            RuleFor(x => x.SideHustles)
                .Must(s => s is null || s.Count == 0)
                .WithMessage("Side hustles should not be provided when the section is hidden.");
        });
    }
}
