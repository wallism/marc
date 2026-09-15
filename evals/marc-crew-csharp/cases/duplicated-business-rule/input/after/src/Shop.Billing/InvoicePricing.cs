using System;

namespace Shop.Billing;

public sealed class InvoicePricing
{
    public decimal Total(Invoice invoice)
    {
        var net = invoice.NetAmount;
        var tax = net * 0.12m;
        return Math.Round(net + tax, 2, MidpointRounding.ToEven);
    }

    public InvoiceLine ToInvoiceLine(Invoice invoice) => new()
    {
        Reference = invoice.Reference,
        DueOn = invoice.DueOn,
        Amount = Total(invoice)
    };
}
