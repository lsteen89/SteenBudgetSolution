using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.Mappings.Budget;

internal static class RepaymentStrategyParsing
{
    public static RepaymentStrategy Parse(string? s) =>
        (s ?? "").Trim().ToLowerInvariant() switch
        {
            "snowball" => RepaymentStrategy.Snowball,
            "avalanche" => RepaymentStrategy.Avalanche,
            "noaction" => RepaymentStrategy.NoAction,
            _ => RepaymentStrategy.Unknown
        };
}
