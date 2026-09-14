using System;
using System.Threading.Tasks;

namespace Shop.Orders;

public sealed class OrderConfirmationService
{
    private readonly IEmailSender _email;
    private readonly IOrderStore _orders;

    public OrderConfirmationService(IEmailSender email, IOrderStore orders)
    {
        _email = email;
        _orders = orders;
    }

    public async Task ConfirmAsync(Order order)
    {
        var body = BuildBody(order, out var total);
        order.SetTotal(total);
        await _orders.SaveAsync(order);
        await _email.SendAsync(order.Email, "Your order", body);
    }

    private static string BuildBody(Order order, out decimal total)
    {
        var tax = order.Customer.IsRegisteredCharity ? 0m : order.NetAmount * 0.12m;
        total = Math.Round(order.NetAmount + tax, 2, MidpointRounding.ToEven);

        return $"""
            Thanks for your order {order.Reference}.
            Net: {order.NetAmount:C}
            Tax: {tax:C}
            Total: {total:C}
            """;
    }
}
