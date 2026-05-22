namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

// Request DTO for POST /api/budgets/months/{yearMonth}/savings-methods.
// `Code` is a stable system code from the SavingsMethodCodes set;
// `CustomLabel` must be supplied (and trimmed non-empty) when `Code` is
// "custom", and must be null for any other code.
public sealed record AddSavingsMethodRequestDto(
    string Code,
    string? CustomLabel);
