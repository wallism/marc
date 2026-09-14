using System;
using System.Threading.Tasks;

namespace Shop.Shipping;

public sealed class PickupInStoreProvider : IShippingQuoteProvider
{
    private readonly IStoreLocator _stores;

    public PickupInStoreProvider(IStoreLocator stores)
    {
        _stores = stores;
    }

    public async Task<ShippingQuote> GetQuoteAsync(Basket basket)
    {
        var store = await _stores.FindNearestAsync(basket.PostCode);
        if (store is null)
        {
            return null;
        }

        return new ShippingQuote(Carrier: "pickup", Total: 0m, EtaDays: 1);
    }

    public Task<TrackingInfo> TrackAsync(string reference)
    {
        throw new NotSupportedException("Pickup orders are not tracked.");
    }
}
