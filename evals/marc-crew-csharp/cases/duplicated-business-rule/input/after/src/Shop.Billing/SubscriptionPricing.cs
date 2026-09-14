using System;

namespace Shop.Billing;

public sealed class SubscriptionPricing
{
    public decimal MonthlyTotal(Subscription subscription)
    {
        var net = subscription.SeatCount * subscription.SeatPrice;
        var tax = net * 0.10m;
        return Math.Round(net + tax, 2, MidpointRounding.ToEven);
    }

    public SubscriptionLine ToSubscriptionLine(Subscription subscription) => new()
    {
        PlanCode = subscription.PlanCode,
        Seats = subscription.SeatCount,
        Amount = MonthlyTotal(subscription)
    };
}
