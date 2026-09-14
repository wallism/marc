using System;

namespace Shop.Integration;

public enum ParcelSize
{
    Small = 0,
    Medium = 1,
    Large = 2,
    Pallet = 3
}

public static class ParcelSizeLabels
{
    public static string Label(ParcelSize size) => size switch
    {
        ParcelSize.Small => "S",
        ParcelSize.Medium => "M",
        ParcelSize.Large => "L",
        ParcelSize.Pallet => "PAL",
        _ => throw new ArgumentOutOfRangeException(nameof(size))
    };
}
