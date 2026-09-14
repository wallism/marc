using System.Threading.Tasks;
using Microsoft.AspNetCore.Components;
using Microsoft.Extensions.DependencyInjection;
using Shop.Portal.Baskets;

namespace Shop.Portal.Components;

public partial class BasketPanel : OwningComponentBase
{
    private IBasketService _baskets = default!;
    private BasketView? _basket;

    [Parameter]
    public int BasketId { get; set; }

    protected override void OnInitialized()
    {
        _baskets = ScopedServices.GetRequiredService<IBasketService>();
    }

    protected override async Task OnParametersSetAsync()
    {
        _basket = await _baskets.ReadAsync(BasketId);
    }
}
