param([Parameter(Mandatory = $true)][string]$ArtifactsPath)
$ErrorActionPreference = 'Stop'
$testRoot = Join-Path $ArtifactsPath ([guid]::NewGuid().ToString('N'))
New-Item $testRoot -ItemType Directory -Force | Out-Null
$hookProject = Join-Path $PSScriptRoot 'Marc.BrowserHost.csproj'
dotnet build $hookProject --artifacts-path (Join-Path $testRoot 'hook') -m:1 -p:UseSharedCompilation=false --nologo
if ($LASTEXITCODE -ne 0) { throw 'Hook build failed.' }
$hook = Join-Path $testRoot 'hook/bin/Marc.BrowserHost/debug/Marc.BrowserHost.dll'
@'
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup>
  <ItemGroup><Compile Include="Program.cs" /></ItemGroup>
</Project>
'@ | Set-Content (Join-Path $testRoot 'Probe.csproj')
@'
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ProofService>();
builder.Services.AddHostedService<DirectWorker>();
builder.Services.AddHostedService<FactoryWorker>(sp => new FactoryWorker());
var app = builder.Build();
app.MapGet("/probe", (ProofService proof) => proof.Value);
app.Run();
sealed class ProofService { public string Value => "business-registration-preserved"; }
sealed class DirectWorker : IHostedService {
    public Task StartAsync(CancellationToken ct) { File.WriteAllText(Environment.GetEnvironmentVariable("PROBE_MARKER") + ".direct", "started"); return Task.CompletedTask; }
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
sealed class FactoryWorker : IHostedService {
    public Task StartAsync(CancellationToken ct) { File.WriteAllText(Environment.GetEnvironmentVariable("PROBE_MARKER") + ".factory", "started"); return Task.CompletedTask; }
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
'@ | Set-Content (Join-Path $testRoot 'Program.cs')
dotnet build (Join-Path $testRoot 'Probe.csproj') --artifacts-path (Join-Path $testRoot 'app') -m:1 -p:UseSharedCompilation=false --nologo
if ($LASTEXITCODE -ne 0) { throw 'Probe build failed.' }
$app = Join-Path $testRoot 'app/bin/Probe/debug/Probe.dll'
foreach ($mode in @(
    @{ Name = 'disabled'; Marc = '0'; Legacy = $null; Enabled = $false },
    @{ Name = 'enabled'; Marc = '1'; Legacy = $null; Enabled = $true },
    @{ Name = 'legacy'; Marc = $null; Legacy = '1'; Enabled = $true },
    @{ Name = 'explicit-disabled'; Marc = '0'; Legacy = '1'; Enabled = $false }
)) {
    $enabled = $mode.Enabled
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $listener.Stop()
    $marker = Join-Path $testRoot "worker-$($mode.Name)"
    $start = [System.Diagnostics.ProcessStartInfo]::new('dotnet')
    $start.ArgumentList.Add($app)
    $start.WorkingDirectory = $testRoot
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.Environment['ASPNETCORE_URLS'] = "http://127.0.0.1:$port"
    $start.Environment['DOTNET_STARTUP_HOOKS'] = $hook
    foreach ($setting in @('MARC_BROWSER_UI_ONLY', 'COQ_BROWSER_UI_ONLY')) {
        $start.Environment.Remove($setting) | Out-Null
    }
    if ($null -ne $mode.Marc) { $start.Environment['MARC_BROWSER_UI_ONLY'] = $mode.Marc }
    if ($null -ne $mode.Legacy) { $start.Environment['COQ_BROWSER_UI_ONLY'] = $mode.Legacy }
    $start.Environment['PROBE_MARKER'] = $marker
    $process = [System.Diagnostics.Process]::Start($start)
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    try {
        $ready = $false
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            if ($process.HasExited) { throw "Probe exited: $($stderr.GetAwaiter().GetResult())" }
            try {
                $body = Invoke-RestMethod "http://127.0.0.1:$port/probe" -TimeoutSec 1
                if ($body -eq 'business-registration-preserved') { $ready = $true; break }
            } catch { }
            Start-Sleep -Milliseconds 250
        }
        if (!$ready) { throw 'HTTP server/business registration was not preserved.' }
        foreach ($suffix in @('direct', 'factory')) {
            if ((Test-Path "$marker.$suffix") -eq $enabled) { throw "Unexpected $suffix worker execution; harness enabled=$enabled" }
        }
        Write-Output "PASS: mode=$($mode.Name); HTTP/business service preserved; direct/factory worker execution correct."
    } finally {
        if (!$process.HasExited) { $process.Kill($true) }
        $process.WaitForExit()
        $stdout.GetAwaiter().GetResult() | Set-Content (Join-Path $testRoot "stdout-$($mode.Name).log")
        $stderr.GetAwaiter().GetResult() | Set-Content (Join-Path $testRoot "stderr-$($mode.Name).log")
        $process.Dispose()
    }
}
