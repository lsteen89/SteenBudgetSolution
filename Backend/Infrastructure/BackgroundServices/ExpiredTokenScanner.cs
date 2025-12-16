using Backend.Application.Features.Commands.Auth.RefreshToken;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Settings;
using Microsoft.Extensions.Options;
using MediatR;
//Common layer

public class ExpiredTokenScanner : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredTokenScanner> _logger;
    private readonly TimeSpan _scanInterval;
    private readonly TimeSpan _heartbeatInterval;
    private readonly ExpiredTokenScannerSettings _settings;
    private readonly ITimeProvider _timeProvider;

    public ExpiredTokenScanner(
        IServiceScopeFactory scopeFactory,
        IOptions<ExpiredTokenScannerSettings> options,
        ITimeProvider timeProvider,
        ILogger<ExpiredTokenScanner> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = options.Value;
        _timeProvider = timeProvider;
        _scanInterval = TimeSpan.FromMinutes(_settings.ScanIntervalMinutes);
        _heartbeatInterval = TimeSpan.FromMinutes(_settings.HeartbeatIntervalMinutes);

        _logger.LogInformation(
          "ExpiredTokenScanner scan interval set to {Interval}, heartbeat interval set to {HeartbeatInterval}.",
           _scanInterval, _heartbeatInterval);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiredTokenScanner started.");
        var lastHeartbeat = _timeProvider.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

                await mediator.Send(new ScanExpiredTokensCommand(), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error scanning for expired tokens.");
            }

            if (_timeProvider.UtcNow - lastHeartbeat >= _heartbeatInterval)
            {
                _logger.LogInformation("ExpiredTokenScanner heartbeat: still alive.");
                lastHeartbeat = _timeProvider.UtcNow;
            }

            await Task.Delay(_scanInterval, stoppingToken);
        }

        _logger.LogInformation("ExpiredTokenScanner stopping.");
    }
}

