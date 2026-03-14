// Third-party packages
using FluentValidation;

using Backend.Application.Features.Wizard.Finalization.Processing.Processors;
using Backend.Application.Options.Email;
using Backend.Application.Options.Auth;
using Backend.Application.Options.URL;
using Backend.Application.Features.Authentication.ResetPassword.Orchestrator;
using Backend.Application.Mappings;
using Backend.Application.Features.Wizard.SaveStep;
using Mapster;
using Backend.Application.Common.Behaviors;

// Abstractions
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.GetWizardData.Abstractions;
using Backend.Application.Abstractions.Application.Services.Security;

// services
using Backend.Application.Services.Budget.Bootstrapper;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.Services.Debts;
using Backend.Application.Services.Security;

// Features
using Backend.Application.Features.Wizard.Finalization.Orchestration;
using Backend.Application.Features.Wizard.Finalization.Targets;
using Backend.Application.Features.Wizard.FinalizationPreview.Mapper;
using Backend.Application.Features.Wizard.GetWizardData.Assemble;
using Backend.Application.Features.Wizard.GetWizardData.Reduce;
using Backend.Application.Features.Shared.Issuers.Auth;
using Backend.Application.Features.Authentication.Register.Orchestrator;


// Orchestrators
using Backend.Application.Orchestrators.Email;
using Backend.Application.Orchestrators.Email.Generators;
using Backend.Application.Abstractions.Application.Orchestrators;

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
            cfg.RegisterServicesFromAssemblies(typeof(ApplicationAssemblyMarker).Assembly);

            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
            cfg.AddOpenBehavior(typeof(UnitOfWorkPipelineBehavior<,>));
        });

        // Verification code generator (dev/test fixed code)
        services.AddSingleton<FixedVerificationCodeGenerator>();
        services.AddSingleton<RandomVerificationCodeGenerator>();
        services.AddSingleton<IVerificationCodeGenerator>(sp =>
        {
            var env = sp.GetRequiredService<IHostEnvironment>();
            return (env.IsDevelopment() || env.IsEnvironment("Test"))
                ? sp.GetRequiredService<FixedVerificationCodeGenerator>()
                : sp.GetRequiredService<RandomVerificationCodeGenerator>();
        });

        // Validators
        services.AddValidatorsFromAssemblyContaining<ApplicationAssemblyMarker>();

        // Wizard Step Validators
        services.AddScoped<IWizardStepValidator, IncomeStepValidator>();
        services.AddScoped<IWizardStepValidator, ExpenditureStepValidator>();
        services.AddScoped<IWizardStepValidator, SavingsStepValidator>();
        services.AddScoped<IWizardStepValidator, DebtsStepValidator>();

        // Register global type adapter config
        var cfg = TypeAdapterConfig.GlobalSettings;
        UserMappings.Register(cfg);

        #region Wizard
        // Wizard Step Processors
        services.AddScoped<IWizardStepProcessor, IncomeStepProcessor>();
        services.AddScoped<IWizardStepProcessor, ExpenseStepProcessor>();
        services.AddScoped<IWizardStepProcessor, SavingsStepProcessor>();
        services.AddScoped<IWizardStepProcessor, DebtStepProcessor>();

        // Wizard Orchestration
        services.AddScoped<IWizardStepOrchestrator, WizardStepOrchestrator>();
        // Finalization target factory (DB persistence target)
        services.AddScoped<IFinalizeBudgetTargetFactory, FinalizeBudgetTargetFactory>();
        // Preview read model builder (domain snapshot -> dashboard read model)
        services.AddScoped<IWizardPreviewReadModelBuilder, WizardPreviewReadModelBuilder>();

        #endregion
        // Budget Services;
        services.AddScoped<IBudgetMonthCloseSnapshotService, BudgetMonthCloseSnapshotService>();
        services.AddScoped<IBudgetMonthlyTotalsService, BudgetMonthlyTotalsService>();
        services.AddScoped<IBudgetMonthBootstrapper, BudgetMonthBootstrapper>();
        services.AddScoped<IBudgetDashboardProjector, BudgetDashboardProjector>();

        // Security
        services.AddSingleton<ISeedingGate, EnvSeedingGate>();
        services.AddScoped<IHumanChallengePolicy, HumanChallengePolicy>();
        services.AddScoped<IPasswordService, BcryptPasswordService>();

        //Issuers
        services.AddScoped<IAuthSessionIssuer, AuthSessionIssuer>();

        // Calculators
        services.AddSingleton<IDebtPaymentCalculator, DebtPaymentCalculator>();
        // Wizard Step Data Assembler
        services.AddScoped<IWizardStepDataAssembler, WizardStepDataAssembler>();
        // Wizard Row Reducer
        services.AddScoped<IWizardStepRowReducer, WizardStepRowReducer>();

        // Orchestration
        services.AddScoped<IVerificationCodeOrchestrator, VerificationCodeOrchestrator>();
        services.AddScoped<IRegistrationOrchestrator, RegistrationOrchestrator>();
        services.AddScoped<IPasswordResetOrchestrator, PasswordResetOrchestrator>();
        return services;
    }
}