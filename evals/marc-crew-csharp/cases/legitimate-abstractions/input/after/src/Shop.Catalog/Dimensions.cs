namespace Shop.Catalog;

public readonly record struct Dimensions(decimal WidthMm, decimal HeightMm, decimal DepthMm)
{
    public bool IsOversized => WidthMm > 1200m || HeightMm > 1200m || DepthMm > 1200m;
}
