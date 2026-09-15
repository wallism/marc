using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Shop.Api.Data;

namespace Shop.Api.Pricing;

public sealed class PricingCache
{
    private readonly AppDbContext _db;
    private readonly Dictionary<string, decimal> _entries = new();

    public PricingCache(AppDbContext db)
    {
        _db = db;
    }

    public async Task<decimal> GetOrLoadAsync(string sku)
    {
        if (_entries.TryGetValue(sku, out var cached))
        {
            return cached;
        }

        var price = await _db.Products
            .Where(p => p.Sku == sku)
            .Select(p => p.ListPrice)
            .SingleAsync();

        _entries[sku] = price;
        return price;
    }
}
