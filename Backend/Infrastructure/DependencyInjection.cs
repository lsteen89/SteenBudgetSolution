using Microsoft.Extensions.Options;

// Common layer
using Backend.Common.Services;

// Domain layer
using Backend.Domain.Abstractions;

// Application layer
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Options.Verification;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;

// Infra
using Backend.Infrastructure.Email.Outbox;
using Backend.Infrastructure.BackgroundServices;
using Backend.Infrastructure.Data.Sql.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Identity;
using Backend.Infrastructure.Implementations;
using Backend.Infrastructure.Repositories.Auth;
using Backend.Infrastructure.Repositories.Auth.RefreshTokens;
using Backend.Infrastructure.Repositories.Auth.VerificationTokens;
using Backend.Infrastructure.Repositories.Budget.Audit;
using Backend.Infrastructure.Repositories.Budget.Core;
using Backend.Infrastructure.Repositories.Budget.Months.Editor;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Expense;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.Infrastructure.Repositories.Email;
using Backend.Infrastructure.Repositories.User;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.Data.Repositories;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.ExpenseCategories;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Verification;
// Settings
using Backend.Settings;
using Backend.Settings.Email;

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

        #endregion

        services.Configure<TurnstileOptions>(configuration.GetSection("Turnstile"));
        services.Configure<VerificationCodeOptions>(configuration.GetSection("VerificationCode"));

        services.AddHttpClient<ITurnstileService, TurnstileService>();
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

        #region Repos
        // Budget
        services.AddScoped<IBudgetRepository, BudgetRepository>();
        services.AddScoped<IBudgetMonthDashboardRepository, BudgetMonthDashboardRepository>();
        services.AddScoped<IDebtsRepository, DebtsRepository>();
        services.AddScoped<IExpenditureRepository, ExpenditureRepository>();
        services.AddScoped<IIncomeRepository, IncomeRepository>();
        services.AddScoped<ISavingsRepository, SavingsRepository>();

        // Dashboard
        services.AddScoped<IBudgetDashboardRepository, BudgetDashboardRepository>();
        services.AddScoped<IExpenseCategoryReadRepository, ExpenseCategoryReadRepository>();
        // Budget Months
        services.AddScoped<IBudgetMonthRepository, BudgetMonthRepository>();
        services.AddScoped<IBudgetMonthRepository, BudgetMonthRepository>();
        services.AddScoped<IBudgetMonthSeedSourceRepository, BudgetMonthSeedSourceRepository>();
        services.AddScoped<IBudgetMonthMaterializationRepository, BudgetMonthMaterializationRepository>();
        // Editor
        services.AddScoped<IBudgetMonthEditorRepository, BudgetMonthEditorRepository>();
        services.AddScoped<IBudgetMonthExpenseItemMutationRepository, BudgetMonthExpenseItemMutationRepository>();
        services.AddScoped<IBudgetMonthChangeEventRepository, BudgetMonthChangeEventRepository>();
        services.AddScoped<IBudgetAuditWriter, BudgetAuditWriter>();
        // Wizard
        services.AddScoped<IWizardRepository, WizardRepository>();

        // Email
        services.AddScoped<IEmailVerificationCodeRepository, EmailVerificationCodeRepository>();
        services.AddScoped<IEmailOutboxRepository, EmailOutboxRepository>();

        // User
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserAuthenticationRepository, UserAuthenticationRepository>();
        services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();
        services.AddScoped<IPasswordResetCodeService, PasswordResetCodeService>();
        // Blacklist tokens
        services.AddScoped<ITokenBlacklistRepo, TokenBlacklistRepo>();

        #endregion

        services.AddHostedService<EmailOutboxSenderHostedService>();


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
