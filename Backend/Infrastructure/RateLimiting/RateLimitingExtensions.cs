using System.IdentityModel.Tokens.Jwt;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Presentation.Constants;
using Backend.Common.Utilities;
using System.Text.Json;
using Backend.Presentation.Shared;

namespace Backend.Infrastructure.RateLimiting;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddAppRateLimiting(
        this IServiceCollection services,
        IHostEnvironment environment)
    {
        services.AddRateLimiter(options =>
        {
            var debugLimit = 1000;
            var isProduction = environment.IsProduction();

            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetIpKey(httpContext, "global"),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isProduction ? 300 : debugLimit,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 2
                    }));

            options.AddPolicy(RateLimitPolicies.Registration, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetIpKey(httpContext, "register"),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 3,
                        Window = TimeSpan.FromMinutes(2),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitPolicies.Login, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetIpKey(httpContext, "login"),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(10),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitPolicies.Refresh, httpContext =>
            {
                var sid = httpContext.Request.Headers["X-Session-Id"].FirstOrDefault();
                var key = !string.IsNullOrWhiteSpace(sid)
                    ? $"refresh:sid:{sid}"
                    : GetIpKey(httpContext, "refresh");

                return RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: key,
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = isProduction ? 30 : debugLimit,
                        Window = TimeSpan.FromMinutes(5),
                        SegmentsPerWindow = 5,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });

            options.AddPolicy(RateLimitPolicies.Logout, httpContext =>
            {
                var userId = httpContext.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                var key = !string.IsNullOrWhiteSpace(userId)
                    ? $"logout:u:{userId}"
                    : GetIpKey(httpContext, "logout");

                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: key,
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isProduction ? 10 : debugLimit,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });



            options.AddPolicy(RateLimitPolicies.VerifyEmail, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetIpKey(httpContext, "verify-email"),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isProduction ? 10 : debugLimit,
                        Window = TimeSpan.FromMinutes(5),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitPolicies.ResendVerification, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetIpKey(httpContext, "resend-verification"),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isProduction ? 3 : debugLimit,
                        Window = TimeSpan.FromMinutes(15),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitPolicies.ForgotPassword, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetIpKey(httpContext, "forgot-password"),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isProduction ? 3 : debugLimit,
                        Window = TimeSpan.FromMinutes(15),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitPolicies.ResetPassword, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: GetIpKey(httpContext, "reset-password"),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = isProduction ? 5 : debugLimit,
                        Window = TimeSpan.FromMinutes(15),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            options.AddPolicy(RateLimitPolicies.SupportMessageSending, httpContext =>
            {
                var userKey =
                    httpContext.User.GetPersoid()?.ToString()
                    ?? httpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: $"support:{userKey}",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 3,
                        Window = TimeSpan.FromMinutes(15),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });

            options.OnRejected = async (context, cancellationToken) =>
    {
        var policyName =
        context.HttpContext.GetEndpoint()
            ?.Metadata
            .GetMetadata<EnableRateLimitingAttribute>()
            ?.PolicyName
        ?? "Global";

        var ipAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        var logger = context.HttpContext.RequestServices
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("RateLimiting");

        logger.LogWarning(
        "Rate limit exceeded: Policy={Policy}, IP={IP}, Endpoint={Endpoint}",
        policyName,
        ipAddress,
        context.HttpContext.Request.Path);

        var envelope = ApiEnvelope<string>.Failure(
        "RateLimit.Exceeded",
        "Rate limit exceeded. Please try again later."
    );

        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json; charset=utf-8";

        await context.HttpContext.Response.WriteAsync(
        JsonSerializer.Serialize(envelope),
        cancellationToken
    );
    };

        });

        return services;
    }

    private static string GetIpKey(HttpContext httpContext, string prefix)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"{prefix}:ip:{ip}";
    }
}