using Backend.Application.Models.Wizard;
using FluentValidation;

namespace Backend.Application.Validators.WizardValidation
{
    public sealed class DebtsIntroValidator : AbstractValidator<DebtsIntro>
    {
        public DebtsIntroValidator()
        {
            // FE: required boolean (nullable allowed in DTO), show Swedish message
            RuleFor(i => i.HasDebts)
                .NotNull()
                .WithMessage("Välj ett alternativ.");
        }
    }

    public sealed class DebtsSummaryValidator : AbstractValidator<DebtsSummary>
    {
        private static readonly HashSet<string> ValidStrategies = new()
        { "avalanche", "snowball", "noAction" };

        public DebtsSummaryValidator()
        {
            RuleFor(s => s.RepaymentStrategy)
                .NotEmpty().WithMessage("Du måste välja en strategi för återbetalning.")
                .Must(s => ValidStrategies.Contains(s ?? string.Empty))
                .WithMessage("Vänligen välj en giltig strategi.");
        }
    }

    public sealed class DebtItemValidator : AbstractValidator<DebtItem>
    {
        private static readonly HashSet<string> ValidDebtTypes = new()
        { "installment", "revolving", "private", "bank_loan" };

        public DebtItemValidator()
        {
            RuleFor(d => d.Id)
                .NotEmpty();

            RuleFor(d => d.Type)
                .NotEmpty()
                .Must(ValidDebtTypes.Contains)
                .WithMessage("Invalid debt type specified.");

            RuleFor(d => d.Name)
                .NotEmpty()
                .WithMessage("Ange ett namn på skulden.");

            RuleFor(d => d.Balance)
                .NotNull().WithMessage("Du måste ange ett belopp.")
                .GreaterThanOrEqualTo(0)
                .WithMessage("Beloppet kan inte vara negativt");

            RuleFor(d => d.Apr)
                .NotNull().WithMessage("Du måste ange en ränta (ange 0 om räntefritt).")
                .GreaterThanOrEqualTo(0)
                .WithMessage("Räntan kan inte vara negativ");

            RuleFor(d => d.MonthlyFee)
                .GreaterThanOrEqualTo(0)
                .When(d => d.MonthlyFee.HasValue)
                .WithMessage("Avgiften kan inte vara negativ");

            // revolving → minPayment required and >= 1
            RuleFor(d => d.MinPayment)
                .NotNull().WithMessage("Minsta betalning krävs för denna lånetyp.")
                .GreaterThanOrEqualTo(1).WithMessage("Måste vara minst 1 kr")
                .When(d => d.Type == "revolving");

            // installment/bank_loan → termMonths required and >= 1 (integer by type)
            RuleFor(d => d.TermMonths)
                .NotNull().WithMessage("Löptid i månader krävs för denna lånetyp.")
                .GreaterThanOrEqualTo(1).WithMessage("Löptiden måste vara minst 1 månad")
                .When(d => d.Type == "installment" || d.Type == "bank_loan");
        }

        public sealed class DebtsValidator : AbstractValidator<DebtsFormValues>
        {
            public DebtsValidator()
            {
                When(x => x.Intro != null, () =>
                {
                    RuleFor(x => x.Intro!).SetValidator(new DebtsIntroValidator());
                });

                When(x => x.Summary != null, () =>
                {
                    RuleFor(x => x.Summary!).SetValidator(new DebtsSummaryValidator());
                });

                // Align to FE UX:
                // - When hasDebts == true -> at least one debt
                // - When hasDebts == false -> debts must be empty or null
                When(x => x.Intro != null, () =>
                {
                    // Case 1: User said YES to debts
                    When(x => x.Intro!.HasDebts == true, () =>
                    {
                        // The list must not be empty *ONLY IF* the list itself
                        // is part of this save request (i.e., not null).
                        // This allows sub-step 1 to save *without* the 'debts' array.
                        RuleFor(x => x.Debts)
                            .NotEmpty()
                            .When(x => x.Debts != null)
                            .WithMessage("Minst en skuld behövs när du angett att du har skulder.");
                    });

                    // Case 2: User said NO to debts
                    When(x => x.Intro!.HasDebts == false, () =>
                    {
                        // The list must be null or empty. This rule is fine as-is.
                        RuleFor(x => x.Debts)
                            .Must(d => d == null || d.Count == 0)
                            .WithMessage("Du har angett att du saknar skulder, listan måste vara tom.");
                    });
                });
            }
        }
    }
}