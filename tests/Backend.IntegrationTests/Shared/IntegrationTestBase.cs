
using Backend.Application.Abstractions.Application.Services.Security; // IPasswordService
using Backend.IntegrationTests.Shared;
using Backend.Application.Services.Security;


public abstract class IntegrationTestBase
{
    protected readonly MariaDbFixture Db;
    // Instantiate once per test class instance
    protected readonly IPasswordService PasswordService = new BcryptPasswordService();

    protected IntegrationTestBase(MariaDbFixture db)
    {
        Db = db;
    }
}