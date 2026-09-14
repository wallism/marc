namespace Shop.Catalog;

public static class VolumeMath
{
    public static decimal LitresOf(Dimensions dimensions)
        => dimensions.WidthMm * dimensions.HeightMm * dimensions.DepthMm / 1_000_000m;
}
