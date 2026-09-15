using System;
using System.Collections.Generic;

namespace Shop.Api.Mapping;

public sealed class MapperRegistry
{
    private readonly Dictionary<(Type Source, Type Target), object> _mappers = new();

    public void Register<TSource, TTarget>(IEntityMapper<TSource, TTarget> mapper)
        => _mappers[(typeof(TSource), typeof(TTarget))] = mapper;

    public TTarget Map<TSource, TTarget>(TSource source, MappingOptions? options = null)
    {
        var mapper = (IEntityMapper<TSource, TTarget>)_mappers[(typeof(TSource), typeof(TTarget))];
        return mapper.Map(source, options ?? MappingOptions.Default);
    }
}
