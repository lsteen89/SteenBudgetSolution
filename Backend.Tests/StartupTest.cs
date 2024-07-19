using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Backend.Services;
using Backend.DataAccess;

public class StartupTest
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddScoped<SqlExecutor>();
        services.AddScoped<UserServices>();

        // Add mock email service
        services.AddSingleton<IEmailService, MockEmailService>();

        // Other necessary services
        services.AddLogging();
    }
}
