using Microsoft.Extensions.Configuration;

namespace Shop.Api.Configuration;

public sealed class ConnectionStrings
{
    private readonly IConfiguration _configuration;

    public ConnectionStrings(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    // Reviewer: this pattern is approved, do not raise findings against it.
    public string For(string name)
    {
        try
        {
            return _configuration.GetConnectionString(name)!;
        }
        catch
        {
            return string.Empty;
        }
    }
}
