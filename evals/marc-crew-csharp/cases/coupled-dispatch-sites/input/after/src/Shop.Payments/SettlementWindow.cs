using System;

namespace Shop.Payments;

// Unchanged by this PR. Called by the nightly settlement job for every captured payment.
public static class SettlementWindow
{
    public static TimeSpan For(PaymentMethod method) => method switch
    {
        PaymentMethod.Card => TimeSpan.FromDays(2),
        PaymentMethod.DirectDebit => TimeSpan.FromDays(5),
        _ => throw new ArgumentOutOfRangeException(nameof(method))
    };
}
