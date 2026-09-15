using System.Threading.Tasks;

namespace Shop.Payments;

public sealed class PaymentWebhookHandler
{
    private readonly IPaymentLookup _payments;

    public PaymentWebhookHandler(IPaymentLookup payments)
    {
        _payments = payments;
    }

    public async Task HandleAsync(PaymentWebhookRequest request)
    {
        var payment = await _payments.LookupAsync(request.Reference!);
        payment.Settle(request.AmountMinor);
        await _payments.SaveAsync(payment);
    }
}
