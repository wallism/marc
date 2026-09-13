using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

// Opt-in UI verification harness. The reviewed application binaries remain unchanged.
public static class StartupHook
{
    private static IDisposable? subscription;

    public static void Initialize()
    {
        // The explicit MARC setting wins; old launchers retain their opt-in behavior.
        var uiOnly = Environment.GetEnvironmentVariable("MARC_BROWSER_UI_ONLY")
            ?? Environment.GetEnvironmentVariable("COQ_BROWSER_UI_ONLY");
        if (uiOnly == "1")
            subscription = DiagnosticListener.AllListeners.Subscribe(new HostObserver());
    }

    private sealed class HostObserver : IObserver<DiagnosticListener>, IObserver<KeyValuePair<string, object?>>
    {
        private readonly List<IDisposable> listeners = [];

        public void OnNext(DiagnosticListener listener)
        {
            if (listener.Name == "Microsoft.Extensions.Hosting")
                listeners.Add(listener.Subscribe(this));
        }

        public void OnNext(KeyValuePair<string, object?> notification)
        {
            if (notification.Key != "HostBuilding" || notification.Value is not IHostBuilder builder)
                return;

            builder.ConfigureServices((_, services) =>
            {
                var omitted = 0;
                foreach (var descriptor in services.Where(d => d.ServiceType == typeof(IHostedService)).ToArray())
                {
                    // Preserve the HTTP server; omit all background work, including factory registrations.
                    if (descriptor.ImplementationType?.FullName == "Microsoft.AspNetCore.Hosting.GenericWebHostService")
                        continue;

                    services.Remove(descriptor);
                    var identity = descriptor.ImplementationType?.FullName
                        ?? descriptor.ImplementationInstance?.GetType().FullName
                        ?? descriptor.ImplementationFactory?.Method.ToString()
                        ?? "unknown registration";
                    Console.Error.WriteLine($"MARC UI harness omitted hosted service: {identity}");
                    omitted++;
                }
                Console.Error.WriteLine($"MARC UI harness applied: {omitted} background hosted services omitted.");
            });
        }

        public void OnCompleted() { }
        public void OnError(Exception error) => throw new InvalidOperationException("MARC host observation failed.", error);
    }
}
