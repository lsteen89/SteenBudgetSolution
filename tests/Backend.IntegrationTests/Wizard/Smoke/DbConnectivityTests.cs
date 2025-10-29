using Dapper;
using FluentAssertions;
using MySqlConnector;
using Xunit;
using Backend.IntegrationTests.Shared;

namespace Backend.IntegrationTests.Smoke;

[Collection("it:db")]
[Trait("TestCategory", "Integration")]
public sealed class DbConnectivityTests
{
    private readonly MariaDbFixture _fx;
    public DbConnectivityTests(MariaDbFixture fx) => _fx = fx;

    [Fact]
    public async Task can_connect_and_query()
    {
        await using var conn = new MySqlConnection(_fx.ConnectionString);
        var one = await conn.ExecuteScalarAsync<int>("SELECT 1");
        one.Should().Be(1);
    }

    [Fact]
    public async Task respawn_resets_between_tests()
    {
        // write using a short-lived connection
        await using (var setup = new MySqlConnection(_fx.ConnectionString))
        {
            await setup.OpenAsync();
            await setup.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS t(x INT) ENGINE=InnoDB;
                INSERT INTO t(x) VALUES(42);");
        }

        await _fx.ResetAsync(); // runs on a different connection

        // assert using a NEW connection (new snapshot)
        await using var check = new MySqlConnection(_fx.ConnectionString);
        await check.OpenAsync();
        var rows = await check.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM t");
        rows.Should().Be(0);
    }
}
