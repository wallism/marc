using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Shop.Worker;

public sealed class ReconciliationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<ReconciliationWorker> _logger;

    public ReconciliationWorker(IServiceScopeFactory scopes, ILogger<ReconciliationWorker> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await using var scope = _scopes.CreateAsyncScope();
            var job = scope.ServiceProvider.GetRequiredService<IReconciliationJob>();

            try
            {
                var settled = await job.RunAsync(stoppingToken);
                _logger.LogInformation("Reconciled {Count} payments", settled);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
