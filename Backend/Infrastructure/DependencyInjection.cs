using Microsoft.Extensions.Options;

// Common layer
using Backend.Common.Services;

// Domain layer
using Backend.Domain.Abstractions;

// Application layer
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;

using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Infrastructure.BackgroundServices;
using Backend.Infrastructure.Data.Sql.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Identity;
using Backend.Infrastructure.Implementations;
using Backend.Infrastructure.Repositories.Auth;
using Backend.Infrastructure.Repositories.Auth.RefreshTokens;
using Backend.Infrastructure.Repositories.Auth.VerificationTokens;
using Backend.Infrastructure.Repositories.Budget;
using Backend.Infrastructure.Repositories.Email;
using Backend.Infrastructure.Repositories.User;
using Backend.Infrastructure.Security;
using Backend.Settings;
using Backend.Settings.Email;
using Backend.Infrastructure.Data.Repositories;

namespace Backend.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration, bool isProduction)
    {
        #region settings
        // Configure the ExpiredTokenScannerSettings
        services.Configure<ExpiredTokenScannerSettings>(
            configuration.GetSection("ExpiredTokenScannerSettings"));

        // Configure the WebSocketHealthCheckSettings
        services.Configure<WebSocketHealthCheckSettings>(
            configuration.GetSection("WebSocketHealthCheckSettings"));

        // Configure the JWT settings
        var jwtSettingsSection = configuration.GetSection("JwtSettings");

        // DB settings
        services.Configure<DatabaseSettings>(configuration.GetSection("DatabaseSettings"));

        // Email settings (Smtp)
        services.Configure<SmtpSettings>(configuration.GetSection("Smtp"));

        services.Configure<DatabaseSettings>(configuration.GetSection("DatabaseSettings"));
        #endregion


        // Caching
        if (isProduction)
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = configuration.GetSection("Redis")["ConnectionString"];
                options.InstanceName = "eBudget:";
            });
            services.AddScoped<ITokenBlacklistService, TokenBlacklistService>();
        }
        else
        {
            services.AddDistributedMemoryCache();
            services.AddScoped<ITokenBlacklistService, NoopBlacklistService>();
        }

        // Section for SQL related services
        // Connection factory
        services.AddScoped<IConnectionFactory>(provider =>
        {
            var settings = provider.GetRequiredService<IOptions<DatabaseSettings>>().Value;
            if (string.IsNullOrEmpty(settings.ConnectionString))
            {
                throw new InvalidOperationException("Database connection string not found in configuration.");
            }
            return new MySqlConnectionFactory(settings.ConnectionString);
        });
        // Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Contexts
        services.AddScoped<ICurrentUserContext, HttpCurrentUserContext>();

        // Repositories
        // Budget
        services.AddScoped<IBudgetRepository, BudgetRepository>();
        services.AddScoped<IDebtsRepository, DebtsRepository>();
        services.AddScoped<IExpenditureRepository, ExpenditureRepository>();
        services.AddScoped<IIncomeRepository, IncomeRepository>();
        services.AddScoped<ISavingsRepository, SavingsRepository>();
        services.AddScoped<IIncomeRepository, IncomeRepository>();

        // Wizard
        services.AddScoped<IWizardRepository, WizardRepository>();

        // User
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserAuthenticationRepository, UserAuthenticationRepository>();

        // Blacklist tokens
        services.AddScoped<ITokenBlacklistRepo, TokenBlacklistRepo>();
        // End of repositories

        // Recaptcha service
        services.AddHttpClient<IRecaptchaService, RecaptchaService>();

        // Section for email services
        services.AddScoped<IEmailRateLimitRepository, EmailRateLimitRepository>();
        services.AddScoped<IEmailRateLimiter, EmailRateLimiter>();



        // Other various services
        services.AddSingleton<ITimeProvider, Backend.Common.Services.TimeProvider>();
        services.AddScoped<ICookieService, CookieService>();

        // JWT Service
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

        // Verification Token Repository
        services.AddScoped<IVerificationTokenRepository, VerificationTokenRepository>();

        // Add WebSockets and their helpers
        services.AddSingleton<IWebSocketManager, Backend.Infrastructure.WebSockets.WebSocketManager>();
        //services.AddHostedService(provider => (Backend.Infrastructure.WebSockets.WebSocketManager)provider.GetRequiredService<IWebSocketManager>());

        // Background services
        services.AddHostedService<ExpiredTokenScanner>();
        services.AddHostedService<WebSocketHealthCheckService>();


        return services;
    }
}