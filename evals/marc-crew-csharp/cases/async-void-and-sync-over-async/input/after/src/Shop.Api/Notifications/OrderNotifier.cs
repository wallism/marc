using System.Net.Http;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;

namespace Shop.Api.Notifications;

public sealed class OrderNotifier
{
    private readonly HttpClient _http;
    private readonly ILogger<OrderNotifier> _logger;

    public OrderNotifier(HttpClient http, ILogger<OrderNotifier> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async void NotifyPlaced(int orderId, string email)
    {
        _logger.LogInformation("Notifying {OrderId}", orderId);

        var response = _http.PostAsJsonAsync("/notifications", new { orderId, email })
            .GetAwaiter()
            .GetResult();

        response.EnsureSuccessStatusCode();
        await _http.PostAsJsonAsync("/notifications/audit", new { orderId });
    }
}
