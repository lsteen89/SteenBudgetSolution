using System.Security.Claims;
using Xunit;
namespace Backend.Tests.UnitTests.Services.UserManagment;
public class UserManagementServiceTests : UnitTestBase
{

    [Fact]
    public async void  CheckAuthStatus_ReturnsUnauthenticated_WhenUserIsNotAuthenticated()
    {
        // Arrange
        var user = new ClaimsPrincipal(new ClaimsIdentity());

        // Act
        var result = await UserAuthenticationServiceInstance.CheckAuthStatusAsync(user);

        // Assert
        Assert.False(result.Authenticated);
        Assert.Null(result.Email);
        Assert.Null(result.Role);
    }
    [Fact]
    public async void CheckAuthStatus_ReturnsUnauthenticated_WhenUserIsNull()
    {
        // Arrange
        ClaimsPrincipal user = null;

        // Act
        var result = await UserAuthenticationServiceInstance.CheckAuthStatusAsync(user);

        // Assert
        Assert.False(result.Authenticated);
        Assert.Null(result.Email);
        Assert.Null(result.Role);
    }


}

