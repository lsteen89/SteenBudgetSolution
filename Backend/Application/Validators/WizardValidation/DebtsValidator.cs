using Backend.Contracts.Wizard;
using FluentValidation;
using System.Collections.Generic;
using System.Linq;

namespace Backend.Application.Validators.WizardValidation
{
    public sealed class DebtsIntroValidator : AbstractValidator<DebtsIntro>
    {
        public DebtsIntroValidator()
        {
            RuleFor(i => i.HasDebts)
                .NotNull().WithMessage("You must specify whether you have debts.");
        }
    }

    public sealed class DebtsInfoValidator : AbstractValidator<DebtsInfo>
    {
        public DebtsInfoValidator()
        {
            RuleFor(i => i.Notes)
                .MaximumLength(2000).WithMessage("Notes cannot exceed 2000 characters.");
        }
    }

    public sealed class DebtItemValidator : AbstractValidator<DebtItem>
    {
        private static readonly HashSet<string> ValidDebtTypes = new() { "installment", "revolving", "private" };

        public DebtItemValidator()
        {
            RuleFor(d => d.Id).NotEmpty();
            RuleFor(d => d.Type).NotEmpty().Must(ValidDebtTypes.Contains).WithMessage("Invalid debt type specified.");
            RuleFor(d => d.Name).NotEmpty().WithMessage("Ange ett namn");

            RuleFor(d => d.Balance).NotNull().GreaterThanOrEqualTo(0);
            RuleFor(d => d.Apr).NotNull().GreaterThanOrEqualTo(0);

            // Conditional validation based on debt type
            RuleFor(d => d.MinPayment)
                .NotNull().GreaterThanOrEqualTo(1)
                .When(d => d.Type == "revolving").WithMessage("A minimum payment is required for revolving debt.");

            RuleFor(d => d.TermMonths)
                .NotNull().GreaterThanOrEqualTo(1)
                .When(d => d.Type == "installment").WithMessage("A term is required for installment debt.");
        }
    }

    // Main orchestrator validator for the entire Debts step
    public sealed class DebtsValidator : AbstractValidator<DebtsFormValues>
    {
        public DebtsValidator()
        {
            When(x => x.Intro != null, () =>
            {
                RuleFor(x => x.Intro).SetValidator(new DebtsIntroValidator());
            });

            When(x => x.Info != null, () =>
            {
                RuleFor(x => x.Info).SetValidator(new DebtsInfoValidator());
            });

            When(x => x.Intro != null && x.Intro.HasDebts == true, () =>
            {
                RuleFor(x => x.Debts)
                    .NotEmpty().WithMessage("Minst en skuld behövs när du angett att du har skulder.");

                RuleForEach(x => x.Debts).SetValidator(new DebtItemValidator());
            });
        }
    }
}