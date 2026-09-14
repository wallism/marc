using System.Threading;
using System.Threading.Tasks;

namespace Shop.Orders;

public sealed class OrderPlacement
{
    private readonly IOrderStore _orders;
    private readonly IBasketReader _baskets;
    private readonly IOrderValidator _validator;
    private readonly IStockReservation _stock;
    private readonly TimeProvider _time;

    public OrderPlacement(
        IOrderStore orders,
        IBasketReader baskets,
        IOrderValidator validator,
        IStockReservation stock,
        TimeProvider time)
    {
        _orders = orders;
        _baskets = baskets;
        _validator = validator;
        _stock = stock;
        _time = time;
    }

    public async Task<OrderPlacementResult> PlaceAsync(int basketId, CancellationToken cancellationToken)
    {
        var basket = await _baskets.ReadAsync(basketId, cancellationToken);
        var validation = _validator.Validate(basket);
        if (!validation.IsValid)
        {
            return OrderPlacementResult.Rejected(validation.Reason);
        }

        var reservation = await _stock.ReserveAsync(basket.Lines, cancellationToken);
        if (!reservation.Succeeded)
        {
            return OrderPlacementResult.Rejected(reservation.Reason);
        }

        var order = Order.From(basket, reservation.Id, _time.GetUtcNow());
        await _orders.SaveAsync(order, cancellationToken);
        return OrderPlacementResult.Placed(order.Id);
    }
}
