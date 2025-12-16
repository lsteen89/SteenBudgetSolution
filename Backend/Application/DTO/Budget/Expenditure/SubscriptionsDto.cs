using System.Text.Json;
using System.Text.Json.Serialization;

public sealed class SubscriptionsDto
{
    [JsonPropertyName("customSubscriptions")]
    public List<SubscriptionDto> CustomSubscriptions { get; set; } = new();

    // Captures "netflix", "spotify", "hbomax", etc.
    [JsonExtensionData]
    public Dictionary<string, JsonElement>? Other { get; set; }

    public IEnumerable<SubscriptionDto> Flatten()
    {
        if (Other is not null)
        {
            foreach (var (key, val) in Other)
            {
                if (val.ValueKind == JsonValueKind.Number && val.TryGetDecimal(out var cost) && cost > 0)
                    yield return new SubscriptionDto { Name = key, Cost = cost };
            }
        }

        if (CustomSubscriptions is not null)
        {
            foreach (var s in CustomSubscriptions)
            {
                if (!string.IsNullOrWhiteSpace(s.Name) && s.Cost > 0)
                    yield return s;
            }
        }
    }
}

public sealed class SubscriptionDto
{
    public string Name { get; set; } = "";
    public decimal Cost { get; set; }
}
