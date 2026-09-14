namespace Shop.Api.Mapping;

public interface IEntityMapper<in TSource, out TTarget>
{
    TTarget Map(TSource source, MappingOptions options);
}

public sealed record MappingOptions
{
    public static readonly MappingOptions Default = new();

    public bool IncludeArchivedAddresses { get; init; }

    public bool ForAdminApi { get; init; }
}
