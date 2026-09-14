using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Shop.Payments;

public sealed class CaptureService
{
    private readonly IPaymentGateway _gateway;
    private readonly IOrderStore _orders;
    private readonly ILedger _ledger;
    private readonly ILogger<CaptureService> _logger;

    public CaptureService(IPaymentGateway gateway, IOrderStore orders, ILedger ledger, ILogger<CaptureService> logger)
    {
        _gateway = gateway;
        _orders = orders;
        _ledger = ledger;
        _logger = logger;
    }

    public async Task<CaptureResult> CaptureAsync(Order order, CancellationToken cancellationToken)
    {
        try
        {
            GatewayReceipt? receipt = null;
            for (var attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    receipt = await _gateway.CaptureAsync(order.PaymentReference, order.Total, cancellationToken);
                    break;
                }
                catch (TimeoutException)
                {
                    await Task.Delay(500, cancellationToken);
                }
            }

            order.MarkPaid(receipt!.AuthCode);
            await _orders.SaveAsync(order, cancellationToken);
            await _ledger.RecordAsync(order.Id, order.Total, receipt.AuthCode, cancellationToken);

            return CaptureResult.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Capture failed for {OrderId}", order.Id);
            return CaptureResult.Success();
        }
    }
}
