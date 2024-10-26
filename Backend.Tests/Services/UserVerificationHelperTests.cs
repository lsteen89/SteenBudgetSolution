using Xunit;
using System;
using System.Threading.Tasks;
using Backend.Helpers;
using Backend.Models;
using Microsoft.Extensions.DependencyInjection;
using Backend.DataAccess;

public class UserVerificationHelperIntegrationTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly UserVerificationHelper _helper;
    private readonly SqlExecutor _sqlExecutor;

    public UserVerificationHelperIntegrationTests()
    {
        // Set up dependency injection for testing
        var serviceCollection = new ServiceCollection();
        var startupTest = new StartupTest();
        startupTest.ConfigureServices(serviceCollection);

        // Build the service provider and retrieve necessary services
        _serviceProvider = serviceCollection.BuildServiceProvider();

        // Resolve services from DI container
        _sqlExecutor = _serviceProvider.GetRequiredService<SqlExecutor>();
        _helper = _serviceProvider.GetRequiredService<UserVerificationHelper>();
    }

    [Fact]
    public async Task ResendVerificationEmail_ShouldSucceedForValidEmail()
    {
        // Arrange: Set up test user in the database
        var testEmail = "test@example.com";
        var userId = Guid.NewGuid();
        await _sqlExecutor.InsertNewUserDatabase(new UserModel { Email = testEmail, PersoId = userId });

        // Act: Call the method under test
        var result = await _helper.ResendVerificationEmailAsync(testEmail);

        // Assert: Verify expected outcome
        Assert.True(result.IsSuccess);
        Assert.Equal("Verification email has been resent.", result.Message);
    }

    [Fact]
    public async Task ResendVerificationEmail_ShouldReturnNotFoundForInvalidEmail()
    {
        // Act
        var result = await _helper.ResendVerificationEmailAsync("nonexistent@example.com");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("User not found.", result.Message);
    }

    // Cleanup method to reset data after each test
    public void Dispose()
    {
        // Clean up any test data to avoid test conflicts
        _sqlExecutor.Execute("DELETE FROM UserVerificationTracking WHERE Email = 'test@example.com'");

        // Dispose of the ServiceProvider when done
        _serviceProvider.Dispose();
    }
}
