using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Shop.Api.Checkout;
using Shop.Api.Data;
using Shop.Api.Pricing;

namespace Shop.Api;

public static class ServiceRegistration
{
    public static IServiceCollection AddShop(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<CheckoutService>();
        services.AddSingleton<PricingCache>();
        return services;
    }
}
