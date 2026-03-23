using System.Text.Json.Serialization;

namespace Backend.Domain.Entities.Budget.Debt;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RepaymentStrategy
{
    Unknown = 0,
    Snowball = 1,
    Avalanche = 2,
    NoAction = 3
}