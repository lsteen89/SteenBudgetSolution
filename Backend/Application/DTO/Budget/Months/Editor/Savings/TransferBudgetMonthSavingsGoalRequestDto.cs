namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

/// <summary>
/// V2 PR-07 — one-time transfer (Sätt in / Ta ut) against a savings goal's
/// running balance (<c>AmountSaved</c>). The sign of the change is carried
/// by <see cref="Direction"/>, never by a negative <see cref="Amount"/> —
/// keeps the wire format readable and unambiguous and lets clients render
/// the chosen direction in confirmation copy.
///
/// <see cref="Note"/> is optional, ≤ 200 chars, stored in the audit
/// payload only (not on the goal row). The V2 modal feeds the chosen
/// counter-account into this field as a structured prefix.
/// </summary>
public sealed record TransferBudgetMonthSavingsGoalRequestDto(
    decimal Amount,
    string Direction,
    string? Note = null);
