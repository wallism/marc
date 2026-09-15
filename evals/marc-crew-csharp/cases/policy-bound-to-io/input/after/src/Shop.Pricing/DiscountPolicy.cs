using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;

namespace Shop.Pricing;

public static class DiscountPolicy
{
    public static decimal Apply(Customer customer, decimal net, DateOnly on)
    {
        if (customer.Tier == CustomerTier.None)
        {
            return net;
        }

        using var http = new HttpClient();
        var blackoutJson = http.GetStringAsync("https://calendar.internal/blackouts").Result;
        var blackouts = JsonSerializer.Deserialize<DateOnly[]>(blackoutJson) ?? Array.Empty<DateOnly>();
        var tiers = JsonSerializer.Deserialize<TierTable>(File.ReadAllText("config/tiers.json"))!;

        if (Array.IndexOf(blackouts, on) >= 0)
        {
            return net;
        }

        var rate = tiers.RateFor(customer.Tier);
        return Math.Round(net * (1m - rate), 2, MidpointRounding.ToEven);
    }
}
