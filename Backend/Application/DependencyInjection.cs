// Third-party packages
using FluentValidation;

using Backend.Application.Features.Wizard.FinalizeWizard.Processors;
using Backend.Application.Options.Email;
using Backend.Application.Options.Auth;
using Backend.Application.Options.URL;
using Backend.Application.Validators;
using Backend.Application.Mappings;
using Backend.Application.Features.Wizard.SaveStep;
using Mapster;
using Backend.Application.Common.Behaviors;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Services.Debts;
using Backend.Application.Features.Budgets.Dashboard;

namespace Backend.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {

        // Settings Registration
        services.AddOptions<EmailRateLimitOptions>()
            .Bind(configuration.GetSection("EmailRateLimit"))
            .ValidateDataAnnotations().ValidateOnStart();
        services.AddOptions<AppUrls>()
            .Bind(configuration.GetSection("AppUrls"))
            .ValidateDataAnnotations().ValidateOnStart();
        services.AddOptions<VerificationTokenOptions>()
            .Bind(configuration.GetSection("VerificationToken"))
            .ValidateDataAnnotations().ValidateOnStart();
        services.AddOptions<AuthLockoutOptions>()
            .BindConfiguration("AuthLockout")
            .ValidateDataAnnotations().ValidateOnStart();

        // MediatR: register handlers by assembly + add UoW behavior
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssemblies(
                typeof(Backend.Application.Features.Authentication.Login.LoginCommandHandler).Assembly
            // add more assemblies if you have handlers elsewhere
            );
            cfg.AddOpenBehavior(typeof(UnitOfWorkPipelineBehavior<,>)); // applies to all TRequest that match the constraint
        });

        // Validators
        services.AddValidatorsFromAssemblyContaining<UserValidator>();
        services.AddValidatorsFromAssemblyContaining<IncomeValidator>();

        // Wizard Step Validators
        services.AddScoped<IWizardStepValidator, IncomeStepValidator>();
        services.AddScoped<IWizardStepValidator, ExpenditureStepValidator>();
        services.AddScoped<IWizardStepValidator, SavingsStepValidator>();
        services.AddScoped<IWizardStepValidator, DebtsStepValidator>();

        // Register global type adapter config
        var cfg = TypeAdapterConfig.GlobalSettings;
        UserMappings.Register(cfg);

        // Wizard Step Processors
        services.AddScoped<IWizardStepProcessor, IncomeStepProcessor>();
        services.AddScoped<IWizardStepProcessor, ExpenseStepProcessor>();
        services.AddScoped<IWizardStepProcessor, SavingsStepProcessor>();
        services.AddScoped<IWizardStepProcessor, DebtStepProcessor>();

        //Wizard Validation

        // Calculators
        services.AddSingleton<IDebtPaymentCalculator, DebtPaymentCalculator>();

        // Service Registrations
        services.AddScoped<IBudgetDashboardQueryService, BudgetDashboardQueryService>();

        return services;
    }
}