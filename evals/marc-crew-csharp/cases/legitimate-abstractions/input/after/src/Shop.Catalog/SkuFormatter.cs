namespace Shop.Catalog;

public sealed class SkuFormatter : ISkuFormatter
{
    public string Format(string supplierCode, int sequence)
        => $"{supplierCode.ToUpperInvariant()}-{sequence:D6}";
}
