using System;

namespace Shop.Payments;

public static class FeeCalculator
{
    public static decimal Fee(PaymentMethod method, decimal amount) => method switch
    {
        PaymentMethod.Card => amount * 0.014m,
        PaymentMethod.DirectDebit => 0.20m,
        PaymentMethod.Klarna => amount * 0.032m,
        _ => throw new ArgumentOutOfRangeException(nameof(method))
    };
}
