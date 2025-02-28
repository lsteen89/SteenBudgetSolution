using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.WebSockets;
using Backend.Application.Services.EmailServices;
using Backend.Application.Services.UserServices;
using Backend.Infrastructure.WebSockets;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Net;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.IdentityModel.Tokens.Jwt;
using Xunit;
using Backend.Infrastructure.Data.Sql.Providers.UserProvider;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;

namespace Backend.Tests.Fixtures
{
    public class WebSocketFixture : IAsyncLifetime
    {
        public IHost Host { get; private set; }
        public string ServerAddress { get; private set; }
        private readonly int _port;

        public WebSocketFixture()
        {
            _port = GetFreePort();
            Host = Microsoft.Extensions.Hosting.Host.CreateDefaultBuilder()
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseKestrel(options =>
                    {
                        options.Listen(IPAddress.Loopback, _port);
                    });

                    webBuilder.ConfigureServices(services =>
                    {
                        // Core services
                        services.AddControllers();
                        services.AddAuthentication("Test")
                                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", null);

                        services.AddSingleton<WebSocketManager>(); // Singleton service
                        services.AddSingleton<IWebSocketManager>(sp => sp.GetRequiredService<WebSocketManager>()); // Interface resolution
                        services.AddHostedService(sp => sp.GetRequiredService<WebSocketManager>()); // HostedService lifecycle


                        // Other dependencies
                        services.AddScoped<IUserServices, UserServices>();
                        services.AddScoped<IUserSQLProvider, UserSQLProvider>();
                        services.AddScoped<IEmailService, EmailService>();
                        services.AddScoped<IUserTokenService, UserTokenService>();
                        services.AddScoped<IEmailResetPasswordService, EmailResetPasswordService>();
                    });

                    webBuilder.ConfigureLogging(logging =>
                    {
                        logging.ClearProviders();
                        logging.AddConsole();
                        logging.SetMinimumLevel(LogLevel.Debug);
                    });

                    webBuilder.Configure(app =>
                    {
                        app.UseWebSockets();
                        app.UseRouting();
                        app.UseAuthentication();
                        app.UseAuthorization();

                        app.UseEndpoints(endpoints =>
                        {
                            endpoints.MapControllers();
                            endpoints.Map("/ws/auth", async context =>
                            {
                                if (context.WebSockets.IsWebSocketRequest)
                                {
                                    var webSocket = await context.WebSockets.AcceptWebSocketAsync();
                                    var webSocketManager = context.RequestServices.GetRequiredService<IWebSocketManager>();
                                    await webSocketManager.HandleConnectionAsync(webSocket, context);
                                }
                                else
                                {
                                    context.Response.StatusCode = 400;
                                }
                            });
                        });
                    });
                })
                .Build();
        }

        private int GetFreePort()
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
        }

        public async Task InitializeAsync()
        {
            await Host.StartAsync();
            ServerAddress = $"http://localhost:{_port}";
            Console.WriteLine($"WebSocket test server started at: {ServerAddress}");
        }

        public async Task DisposeAsync()
        {
            Console.WriteLine("WebSocketFixture disposing. Stopping host...");
            await Host.StopAsync();
            Console.WriteLine("Host stopped cleanly.");
            Host.Dispose();
        }
    }

    // Mock Authentication Handler for testing
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock)
            : base(options, logger, encoder, clock)
        { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // Check if the header "Test-Auth" is "true"
            if (!Request.Headers.TryGetValue("Test-Auth", out var testAuth) || testAuth != "true")
            {
                return Task.FromResult(AuthenticateResult.Fail("Invalid Test-Auth header"));
            }

            // Read required headers for claims
            var claims = new List<Claim>();
            if (Request.Headers.TryGetValue("sub", out var sub))
            {
                claims.Add(new Claim(JwtRegisteredClaimNames.Sub, sub));
            }
            if (Request.Headers.TryGetValue("sessionId", out var sessionId))
            {
                claims.Add(new Claim("sessionId", sessionId));
            }

            if (!claims.Any())
            {
                return Task.FromResult(AuthenticateResult.Fail("Required claims not provided"));
            }

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}