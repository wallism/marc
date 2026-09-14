using System.Data;
using System.Threading;
using System.Threading.Tasks;
using Dapper;

namespace Shop.Billing;

public sealed class TierPricing
{
    private readonly IDbConnection _connection;

    public TierPricing(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<decimal> PriceForAsync(int customerId, decimal net, CancellationToken cancellationToken)
    {
        var command = new CommandDefinition(
            "dbo.CalculateTierPrice",
            new { CustomerId = customerId, NetAmount = net },
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken);

        return await _connection.ExecuteScalarAsync<decimal>(command);
    }
}
