// Backend.Tests/Fixtures/WebSocketFixture.cs

using Backend.Application.Common.Security;
using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.WebSockets;
using Backend.Application.Services.EmailServices;
using Backend.Application.Services.UserServices;
using Backend.Common.Interfaces;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Backend.Infrastructure.Data.Sql.Providers.UserProvider;
using Backend.Infrastructure.Entities.Tokens;
using Backend.Infrastructure.Implementations;
using Backend.Settings;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using System.Data.Common;
using System.Net;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Xunit;
using InfraWsManager = Backend.Infrastructure.WebSockets.WebSocketManager;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Backend.Infrastructure.WebSockets;
using static MailKit.Telemetry;

public sealed class WebSocketFixture : IAsyncLifetime
{
    public IHost Host { get; private set; } = default!;
    public string ServerAddress { get; private set; } = default!;
    private readonly int _port = GetFreePort();

    public WebSocketFixture()
    {
        JwtSecurityTokenHandler.DefaultMapInboundClaims = false;
        JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
        Host = Microsoft.Extensions.Hosting.Host.CreateDefaultBuilder()
        .ConfigureWebHostDefaults(web =>
        {
                web.UseKestrel(o => o.Listen(IPAddress.Loopback, _port));

                web.ConfigureServices(services =>
                {
                    // ── WS health check settings ────────────────────────
                    services.Configure<WebSocketHealthCheckSettings>(opt =>
                    {
                        opt.MissedPongThreshold = 1;
                        opt.LogoutOnStaleConnection = false;
                        opt.PongTimeout = TimeSpan.FromSeconds(10);
                    });
                    // H-MAC secret (32-byte hex, keep it hard-coded inside test assembly)
                    const string wsSecret = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
                    services.Configure<WebSocketSettings>(o => o.Secret = wsSecret);
                    
                    // ── Dummy MVC auth (not used by WS) ─────────────────
                    services.AddControllers();
                    services.AddAuthentication("Test")
                            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
                    var secret = "0123456789ABCDEF0123456789ABCDEF"; // 32 chars
                    // ── JWT plumbing for WS manager ────────────────────
                    services.AddSingleton(new JwtSettings
                    {
                        SecretKey = secret,
                        Issuer = "test",
                        Audience = "test",
                        ExpiryMinutes = 10,
                        RefreshTokenExpiryDays = 1,
                        RefreshTokenExpiryDaysAbsolute = 1
                    });

                    services.AddSingleton(new TokenValidationParameters
                    {
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = false,     // unit-test: ignore exp
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                        ClockSkew = TimeSpan.Zero
                    });

                    // stub low-level dependencies
                    services.AddSingleton<IUserSQLProvider>(_ => new Mock<IUserSQLProvider>().Object);
                    var blacklistMock = new Mock<ITokenBlacklistService>();
                    blacklistMock
                      .Setup(x => x.IsTokenBlacklistedAsync(It.IsAny<string>()))
                      .ReturnsAsync(false);
                    services.AddSingleton<ITokenBlacklistService>(blacklistMock.Object);
                    services.AddSingleton<IRefreshTokenSqlExecutor>(_ => new Mock<IRefreshTokenSqlExecutor>().Object);
                    services.AddSingleton<IEnvironmentService>(_ => new Mock<IEnvironmentService>().Object);
                    services.AddSingleton<ITimeProvider>(_ => new Mock<ITimeProvider>().Object);
                    services.AddHttpContextAccessor();

                    // now the real JwtService
                    services.AddSingleton<JwtService>();
                    services.AddSingleton<IJwtService>(sp => sp.GetRequiredService<JwtService>());

                    // ── real WS manager + hosted‐service ───────────────────
                    services.AddSingleton<InfraWsManager>();
                    services.AddSingleton<IWebSocketManager>(sp => sp.GetRequiredService<InfraWsManager>());
                    services.AddHostedService(sp => sp.GetRequiredService<InfraWsManager>());

                });

                web.ConfigureLogging(l =>
                {
                    l.ClearProviders();
                    l.AddConsole();
                    l.SetMinimumLevel(LogLevel.Debug);
                });

                web.Configure(app =>
                {
                    app.UseWebSockets();
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();

                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapControllers();
                        endpoints.Map("/ws/auth", async ctx =>
                        {
                            if (!ctx.WebSockets.IsWebSocketRequest)
                            {
                                ctx.Response.StatusCode = 400;
                                return;
                            }

                            var q = ctx.Request.Query;
                               if (!Guid.TryParse(q["pid"], out var pid) ||
                            !Guid.TryParse(q["sid"], out var sid) ||
                            string.IsNullOrEmpty(q["mac"]))
                                {
                                ctx.Response.StatusCode = 400; return;
                                }
                            
                               // validate mac just like prod
                            var wsCfg = ctx.RequestServices.GetRequiredService<IOptions<WebSocketSettings>>().Value;
                               if (!WebSocketAuth.MacMatches(pid, sid, q["mac"]!, wsCfg.Secret))
                               {
                                ctx.Response.StatusCode = 401; return;
                                }
                            
                            var socket = await ctx.WebSockets.AcceptWebSocketAsync("hmac-v1");
                            var mgr = ctx.RequestServices.GetRequiredService<InfraWsManager>();
                            await mgr.HandleConnectionAsync(socket, pid, sid);
                        });
                    });
                });
            })
            .Build();
    }

    public async Task InitializeAsync()
    {
        await Host.StartAsync();
        ServerAddress = $"http://localhost:{_port}";
    }

    public async Task DisposeAsync()
    {
        await Host.StopAsync();
        Host.Dispose();
    }

    private static int GetFreePort()
    {
        using var l = new TcpListener(IPAddress.Loopback, 0);
        l.Start();
        var p = ((IPEndPoint)l.LocalEndpoint).Port;
        l.Stop();
        return p;
    }
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
                               ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock)
          : base(options, logger, encoder, clock)
        { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("Test-Auth", out var hdr) || hdr != "true")
                return Task.FromResult(AuthenticateResult.Fail("no header"));

            var claims = new List<Claim>();
            if (Request.Headers.TryGetValue("sub", out var sub))
                claims.Add(new Claim(JwtRegisteredClaimNames.Sub, sub.ToString()));
            if (Request.Headers.TryGetValue("sessionId", out var sess))
                claims.Add(new Claim("sessionId", sess.ToString()));

            if (!claims.Any())
                return Task.FromResult(AuthenticateResult.Fail("missing claims"));

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}


