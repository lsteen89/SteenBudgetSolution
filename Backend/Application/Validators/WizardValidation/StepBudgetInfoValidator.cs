using FluentValidation;
using Backend.Application.DTO.Wizard.Steps;

namespace Backend.Application.Validators.WizardValidation
{
    public class StepBudgetInfoValidator : AbstractValidator<StepBudgetInfoDto>
    {
        public StepBudgetInfoValidator()
        {
            RuleFor(x => x.NetSalary)
                .GreaterThan(0)
                .WithMessage("Net salary must be greater than 0.");

            RuleFor(x => x.SalaryFrequency)
                .NotEmpty()
                .WithMessage("Salary frequency is required.");

            When(x => !x.HouseholdMembers.Any(), () =>
            {
                RuleFor(x => x.HouseholdMembers)
                    .Must(members => members == null || members.Count == 0)
                    .WithMessage("Household members should not be provided for individual budgets.");
            });

            When(x => x.HouseholdMembers.Any(), () =>
            {
                RuleFor(x => x.HouseholdMembers)
                    .NotEmpty()
                    .WithMessage("At least one household member is required.");

                RuleForEach(x => x.HouseholdMembers).ChildRules(m =>
                {
                    m.RuleFor(member => member.Name)
                        .NotEmpty()
                        .WithMessage("Ange namn.");
                    m.RuleFor(member => member.Income)
                        .NotEmpty()
                        .WithMessage("Ange nettoinkomst.");
                    m.RuleFor(member => member.Frequency)
                        .NotEmpty()
                        .WithMessage("Välj frekvens.");
                });
            });

            When(x => x.SideHustles.Any(), () =>
            {
                RuleForEach(x => x.SideHustles).ChildRules(s =>
                {
                    s.RuleFor(side => side.Name)
                        .NotEmpty()
                        .WithMessage("Ange namn för sidoinkomst.");
                    s.RuleFor(side => side.Income)
                        .NotEmpty()
                        .WithMessage("Ange sidoinkomstens storlek.");
                    s.RuleFor(side => side.Frequency)
                        .NotEmpty()
                        .WithMessage("Välj sidoinkomstens frekvens.");
                });
            });
        }

    }
}
