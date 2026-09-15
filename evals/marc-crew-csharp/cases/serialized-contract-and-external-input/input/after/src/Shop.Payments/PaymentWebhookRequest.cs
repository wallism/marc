using System.Text.Json.Serialization;

namespace Shop.Payments;

public sealed record PaymentWebhookRequest
{
    [JsonPropertyName("event_id")]
    public string EventId { get; init; } = string.Empty;

    public long AmountMinor { get; init; }

    public string? Reference { get; init; }

    public string? Currency { get; init; }
}
