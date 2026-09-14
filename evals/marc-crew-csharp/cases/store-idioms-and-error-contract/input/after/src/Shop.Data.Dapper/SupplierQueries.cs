using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using Dapper;

namespace Shop.Data.Dapper;

public sealed class SupplierQueries
{
    private readonly IDbConnection _connection;

    public SupplierQueries(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<QueryResult<IReadOnlyList<SupplierRateRow>>> ActiveRatesAsync(
        int supplierId,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (pageSize is < 1 or > 500)
        {
            return QueryResult<IReadOnlyList<SupplierRateRow>>.Invalid("pageSize must be between 1 and 500.");
        }

        const string sql = """
            SELECT TOP (@PageSize) RateCode, AmountMinor, ActiveFrom
            FROM SupplierRates
            WHERE SupplierId = @SupplierId AND ActiveFrom <= SYSUTCDATETIME()
            ORDER BY ActiveFrom DESC
            """;

        var command = new CommandDefinition(
            sql,
            new { SupplierId = supplierId, PageSize = pageSize },
            cancellationToken: cancellationToken);

        var rows = await _connection.QueryAsync<SupplierRateRow>(command);
        return QueryResult<IReadOnlyList<SupplierRateRow>>.Ok(rows.AsList());
    }
}
