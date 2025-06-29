using System;
using System.Text.Json.Serialization;

namespace Backend.Contracts.Wizard;

public sealed class SavingsGoal
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("targetAmount")]
    public decimal? TargetAmount { get; init; }

    [JsonPropertyName("targetDate")]
    public DateTime? TargetDate { get; init; }


    [JsonPropertyName("amountSaved")]
    public decimal? AmountSaved { get; init; }
}
