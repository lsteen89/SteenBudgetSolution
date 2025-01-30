using System.Security.Claims;
using Xunit;
namespace Backend.Tests.UnitTests.Services.UserManagment;
public class UserManagementServiceTests : UnitTestBase
{
    [Fact]
    public void CheckAuthStatus_ReturnsAuthenticated_WhenUserIsAuthenticated()
    {
        // Arrange
        var claims = new[]
        {
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "admin")
        };
        var identity = new ClaimsIdentity(claims, "mock");
        var user = new ClaimsPrincipal(identity);

        // Act
        var result = UserAuthenticationServiceInstance.CheckAuthStatus(user);

        // Assert
        Assert.True(result.Authenticated);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("admin", result.Role);
    }

    [Fact]
    public void CheckAuthStatus_ReturnsUnauthenticated_WhenUserIsNotAuthenticated()
    {
        // Arrange
        var user = new ClaimsPrincipal(new ClaimsIdentity());

        // Act
        var result = UserAuthenticationServiceInstance.CheckAuthStatus(user);

        // Assert
        Assert.False(result.Authenticated);
        Assert.Null(result.Email);
        Assert.Null(result.Role);
    }
    [Fact]
    public void CheckAuthStatus_ReturnsUnauthenticated_WhenUserIsNull()
    {
        // Arrange
        ClaimsPrincipal user = null;

        // Act
        var result = UserAuthenticationServiceInstance.CheckAuthStatus(user);

        // Assert
        Assert.False(result.Authenticated);
        Assert.Null(result.Email);
        Assert.Null(result.Role);
    }
    [Fact]
    public void CheckAuthStatus_ReturnsFirstRole_WhenMultipleRolesArePresent()
    {
        // Arrange
        var claims = new[]
        {
        new Claim(ClaimTypes.Email, "test@example.com"),
        new Claim(ClaimTypes.Role, "admin"),
        new Claim(ClaimTypes.Role, "user")
    };
        var identity = new ClaimsIdentity(claims, "mock");
        var user = new ClaimsPrincipal(identity);

        // Act
        var result = UserAuthenticationServiceInstance.CheckAuthStatus(user);

        // Assert
        Assert.True(result.Authenticated);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("admin", result.Role); // Or decide on a rule for handling multiple roles
    }
    [Fact]
    public void CheckAuthStatus_ReturnsUnauthenticated_WhenEmailClaimIsMissing()
    {
        // Arrange
        var claims = new[]
        {
        new Claim(ClaimTypes.Role, "admin") // Role claim is included
    };
        var identity = new ClaimsIdentity(claims, "mock");
        var user = new ClaimsPrincipal(identity);

        // Act
        var result = UserAuthenticationServiceInstance.CheckAuthStatus(user);

        // Assert
        Assert.False(result.Authenticated); // Email is required for authentication
        Assert.Null(result.Email);          // Email claim is missing
        Assert.Equal("admin", result.Role); // Role is still extracted
    }
}

