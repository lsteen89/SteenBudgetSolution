using Backend.Application.Models.Wizard;
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

    public sealed class DebtsSummaryValidator : AbstractValidator<DebtsSummary>
    {
        private static readonly HashSet<string> ValidStrategies = new() { "avalanche", "snowball", "noAction" };

        public DebtsSummaryValidator()
        {
            RuleFor(s => s.RepaymentStrategy)
                .NotEmpty().WithMessage("Du måste välja en strategi för återbetalning.")
                .Must(ValidStrategies.Contains).WithMessage("Vänligen välj en giltig strategi.");
        }
    }

    public sealed class DebtItemValidator : AbstractValidator<DebtItem>
    {

        private static readonly HashSet<string> ValidDebtTypes = new() { "installment", "revolving", "private", "bank_loan" };

        public DebtItemValidator()
        {
            RuleFor(d => d.Id).NotEmpty();
            RuleFor(d => d.Type).NotEmpty().Must(ValidDebtTypes.Contains).WithMessage("Invalid debt type specified.");
            RuleFor(d => d.Name).NotEmpty().WithMessage("Ange ett namn på skulden.");

            RuleFor(d => d.Balance).NotNull().GreaterThanOrEqualTo(0);
            RuleFor(d => d.Apr).NotNull().GreaterThanOrEqualTo(0).WithMessage("Ange en ränta (0 om räntefritt).");


            RuleFor(d => d.MonthlyFee)
                .GreaterThanOrEqualTo(0)
                .When(d => d.MonthlyFee.HasValue)
                .WithMessage("Månadsavgiften kan inte vara negativ.");

            // Conditional validation based on debt type
            RuleFor(d => d.MinPayment)
                .NotNull().GreaterThanOrEqualTo(1)
                .When(d => d.Type == "revolving")
                .WithMessage("En minsta betalning krävs för denna lånetyp.");


            RuleFor(d => d.TermMonths)
                .NotNull().GreaterThanOrEqualTo(1)
                .When(d => d.Type == "installment" || d.Type == "bank_loan")
                .WithMessage("Löptid i månader krävs för denna lånetyp.");
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

                When(x => x.Summary != null, () =>
                {
                    RuleFor(x => x.Summary).SetValidator(new DebtsSummaryValidator());
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
}