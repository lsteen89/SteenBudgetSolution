namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

// Response for the base-savings editor.
//
// `MonthlyAmount` is the persisted current-month base savings *after* the
// patch — what the dashboard hero / balance strip should now show.
//
// `IsMonthOnly` echoes `BudgetMonthSavings.SourceSavingsId IS NULL` so the
// FE dialog can disable the plan scopes without a second round-trip. It is
// returned on every response (success or not-yet-mutated no-op) so the FE
// always reaches a consistent gate.
public sealed record BudgetMonthBaseSavingsEditorDto(
    decimal MonthlyAmount,
    bool IsMonthOnly);
