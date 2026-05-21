namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

// Wire DTO for a plan-level savings method. `Code` is a stable system code
// from the SavingsMethodCodes set; `CustomLabel` is only populated when
// `Code == "custom"`. The frontend resolves system codes through i18n and
// renders `CustomLabel` verbatim for custom rows. Row `Id` is included so
// future delete UI has stable row identity.
public sealed record SavingsMethodDto(
    Guid Id,
    string Code,
    string? CustomLabel);
