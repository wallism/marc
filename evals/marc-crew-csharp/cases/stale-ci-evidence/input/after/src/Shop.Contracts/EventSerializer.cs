using System.Text.Json;
using System.Text.Json.Serialization;

namespace Shop.Contracts;

public static class EventSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static string Serialize<TEvent>(TEvent @event) => JsonSerializer.Serialize(@event, Options);

    public static TEvent Deserialize<TEvent>(string payload) => JsonSerializer.Deserialize<TEvent>(payload, Options)!;
}
