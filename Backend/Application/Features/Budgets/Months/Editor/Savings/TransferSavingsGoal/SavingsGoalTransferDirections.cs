namespace Backend.Application.Features.Budgets.Months.Editor.Savings.TransferSavingsGoal;

/// <summary>
/// Stable string constants for the V2 transfer direction. Kept as
/// lowercase ASCII so the wire value matches the validator allow-list
/// exactly and never depends on culture-sensitive case rules.
/// </summary>
public static class SavingsGoalTransferDirections
{
    public const string Deposit = "deposit";
    public const string Withdraw = "withdraw";

    /// <summary>Case-insensitive allow-list check. Mirrors the validator.</summary>
    public static bool IsSupported(string? value)
        => value is not null &&
           (value.Equals(Deposit, StringComparison.OrdinalIgnoreCase) ||
            value.Equals(Withdraw, StringComparison.OrdinalIgnoreCase));

    /// <summary>Normalises a wire value to its canonical lowercase form.</summary>
    public static string Normalize(string? value)
    {
        if (value is null) return string.Empty;
        if (value.Equals(Deposit, StringComparison.OrdinalIgnoreCase)) return Deposit;
        if (value.Equals(Withdraw, StringComparison.OrdinalIgnoreCase)) return Withdraw;
        return value;
    }
}
