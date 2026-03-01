using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Infrastructure.Email.Composers;
using Backend.Settings.Email;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Polly;

namespace Backend.Infrastructure.Email.Outbox;

public sealed class EmailOutboxSenderHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptions<SmtpSettings> _smtp;
    private readonly ILogger<EmailOutboxSenderHostedService> _log;

    public EmailOutboxSenderHostedService(
        IServiceScopeFactory scopeFactory,
        IOptions<SmtpSettings> smtp,
        ILogger<EmailOutboxSenderHostedService> log)
    {
        _scopeFactory = scopeFactory;
        _smtp = smtp;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        var workerId = Guid.NewGuid();

        var retryPolicy = Policy<EmailSendResult>
            .Handle<Exception>()
            .OrResult(r => !r.Success)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (outcome, ts, attempt, _) =>
                    _log.LogWarning("Email send retry {Attempt} after {Delay}: {Error}",
                        attempt, ts, outcome.Exception?.Message ?? outcome.Result.Error)
            );

        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                var now = DateTime.UtcNow;

                // 1) CLAIM in a short tx
                var batch = await ClaimBatchAsync(workerId, now, stoppingToken);
                if (batch.Count == 0) continue;

                var fromAddress = _smtp.Value.FromAddress;
                var fromName = _smtp.Value.FromName;

                if (string.IsNullOrWhiteSpace(fromAddress))
                {
                    _log.LogError("SMTP FromAddress is empty. Marking {Count} outbox items failed.", batch.Count);

                    foreach (var item in batch)
                    {
                        var attempts = item.Attempts + 1;
                        var next = DateTime.UtcNow.AddMinutes(5);
                        await MarkFailedAsync(item.Id, attempts, next, "SMTP FromAddress is empty", stoppingToken);
                    }

                    continue;
                }

                // Resolve email sender once per tick (no tx)
                await using var sendScope = _scopeFactory.CreateAsyncScope();
                var email = sendScope.ServiceProvider.GetRequiredService<IEmailService>();

                // 2) SEND (no tx) + 3) MARK status (short tx per item)
                foreach (var item in batch)
                {
                    _log.LogInformation("Sending outbox email Id={Id} To={To} Kind={Kind} Attempt={Attempt}",
                         item.Id, item.ToEmail, item.Kind, item.Attempts);
                    try
                    {
                        var composer = new OutboxEmailComposer(
                            to: item.ToEmail,
                            subject: item.Subject,
                            bodyHtml: item.BodyHtml,
                            fromAddress: fromAddress,
                            fromName: fromName
                        );

                        var result = await retryPolicy.ExecuteAsync(
                            ct => email.SendEmailAsync(composer, ct),
                            stoppingToken);

                        if (result.Success)
                        {
                            await MarkSentAsync(item.Id, result.ProviderId, stoppingToken);
                            _log.LogInformation("Sent outbox email Id={Id} ProviderId={ProviderId}", item.Id, result.ProviderId);
                            continue;
                        }

                        var attempts = item.Attempts + 1;
                        var next = DateTime.UtcNow.AddMinutes(Math.Min(30d, Math.Pow(2d, attempts)));

                        await MarkFailedAsync(
                            item.Id,
                            attempts,
                            next,
                            result.Error ?? "Unknown email error",
                            stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        var attempts = item.Attempts + 1;
                        var next = DateTime.UtcNow.AddMinutes(Math.Min(30d, Math.Pow(2d, attempts)));

                        await MarkFailedAsync(item.Id, attempts, next, ex.Message, stoppingToken);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // normal shutdown
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Email outbox worker tick failed");
                await Task.Delay(2000, stoppingToken);
            }
        }
    }

    private async Task<IReadOnlyList<EmailOutboxItem>> ClaimBatchAsync(
        Guid workerId,
        DateTime nowUtc,
        CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var outbox = scope.ServiceProvider.GetRequiredService<IEmailOutboxRepository>();

        await uow.BeginTransactionAsync(ct);
        try
        {
            var batch = await outbox.ClaimDueAsync(
                workerId,
                take: 10,
                nowUtc: nowUtc,
                lockFor: TimeSpan.FromMinutes(2),
                ct: ct);

            await uow.CommitAsync(ct);
            return batch;
        }
        catch
        {
            await uow.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private async Task MarkSentAsync(long id, string? providerId, CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var outbox = scope.ServiceProvider.GetRequiredService<IEmailOutboxRepository>();

        await uow.BeginTransactionAsync(ct);
        try
        {
            await outbox.MarkSentAsync(id, providerId, DateTime.UtcNow, ct);
            await uow.CommitAsync(ct);
        }
        catch
        {
            await uow.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private async Task MarkFailedAsync(long id, int attempts, DateTime nextAttemptAtUtc, string error, CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var outbox = scope.ServiceProvider.GetRequiredService<IEmailOutboxRepository>();

        await uow.BeginTransactionAsync(ct);
        try
        {
            await outbox.MarkFailedAsync(id, attempts, nextAttemptAtUtc, error, DateTime.UtcNow, ct);
            await uow.CommitAsync(ct);
        }
        catch
        {
            await uow.RollbackAsync(CancellationToken.None);
            throw;
        }
    }
}
