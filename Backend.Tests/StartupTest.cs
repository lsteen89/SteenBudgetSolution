using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Backend.Services;
using Backend.DataAccess;
using Backend.Helpers;

public class StartupTest
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddScoped<SqlExecutor>();
        services.AddScoped<UserVerificationHelper>();
        services.AddScoped<UserServices>();

        services.AddSingleton<IEmailService, MockEmailService>();

        
        services.AddLogging();
    }
}
