using System.IdentityModel.Tokens.Jwt;
using Backend.Application.Abstractions.Infrastructure.Security;


namespace Backend.Presentation.Middleware
{
    public class TokenBlacklistMiddleware
    {
        private readonly RequestDelegate _next;

        public TokenBlacklistMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Check if the user is authenticated
            if (context.User?.Identity?.IsAuthenticated ?? false)
            {
                // Extract JWT token from Authorization header
                var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                if (authHeader != null && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();

                    try
                    {
                        var handler = new JwtSecurityTokenHandler();
                        var jwtToken = handler.ReadJwtToken(token);
                        var jti = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;

                        if (!string.IsNullOrEmpty(jti))
                        {
                            // Resolve ITokenBlacklistService and ILogger from the request's service provider
                            var tokenBlacklistService = context.RequestServices.GetRequiredService<ITokenBlacklistService>();
                            var logger = context.RequestServices.GetRequiredService<ILogger<TokenBlacklistMiddleware>>();

                            // Check if jti is in the blacklist
                            var isBlacklisted = await tokenBlacklistService.IsTokenBlacklistedAsync(jti);
                            if (isBlacklisted)
                            {
                                logger.LogWarning($"Blacklisted token detected: JTI {jti}");
                                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                                await context.Response.WriteAsync("Token has been revoked.");
                                return; // Short-circuit the pipeline
                            }
                        }
                        else
                        {
                            var logger = context.RequestServices.GetRequiredService<ILogger<TokenBlacklistMiddleware>>();
                            logger.LogWarning("JTI claim not found in token.");
                            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                            await context.Response.WriteAsync("Invalid token.");
                            return;
                        }
                    }
                    catch (Exception ex)
                    {
                        var logger = context.RequestServices.GetRequiredService<ILogger<TokenBlacklistMiddleware>>();
                        logger.LogError(ex, "Error processing token in TokenBlacklistMiddleware.");
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsync("Invalid token.");
                        return;
                    }
                }
            }

            // Call the next middleware in the pipeline
            await _next(context);
        }
    }
}
