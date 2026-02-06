using MySqlConnector;
using Dapper;
namespace Backend.IntegrationTests.Shared.Seeds;

internal static class UserTestSeeds
{
    public static async Task SeedUserAsync(string cs, Guid persoid, string? email = null)
    {
        email ??= $"final+{persoid:N}@example.com";

        await using var conn = new MySqlConnection(cs);
        await conn.ExecuteAsync("""
            INSERT INTO Users (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES (@pid, 'Final', 'User', @email, 1, '$2a$12$abc...', 'User', 0, 0, 'it');
        """, new { pid = persoid, email });
    }
}
