using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Shop.Api.Products;

namespace Shop.Api.Import;

public sealed class ImportService
{
    private readonly IProductRepository _products;

    public ImportService(IProductRepository products)
    {
        _products = products;
    }

    public async Task<ImportResult> ImportAsync(string uploadPath)
    {
        var reader = new StreamReader(uploadPath);
        var header = await reader.ReadLineAsync();

        if (header != "sku,price")
        {
            return ImportResult.Rejected("Unexpected header.");
        }

        var rows = new List<ProductRow>();
        while (await reader.ReadLineAsync() is { } line)
        {
            rows.Add(ProductRow.Parse(line));
        }

        _ = Task.Run(async () =>
        {
            await Task.WhenAll(rows.Select(row => _products.UpsertAsync(row)));
        });

        reader.Dispose();
        return ImportResult.Accepted(rows.Count);
    }
}
