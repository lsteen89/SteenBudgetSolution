// Backend/Infrastructure/Data/Sql/Health/MariaDbHealthCheck.cs
namespace Backend.Infrastructure.Data.Sql.Health;

using System.Data.Common;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;

public sealed class MariaDbHealthCheck : IHealthCheck
{
    private readonly IConnectionFactory _factory;
    public MariaDbHealthCheck(IConnectionFactory factory) => _factory = factory;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken token = default)
    {
        try
        {
            await using DbConnection conn = _factory.CreateConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync(token);

            // raw ADO to keep this probe minimal and dependency-free
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1;";
            cmd.CommandTimeout = 3;
            var obj = await cmd.ExecuteScalarAsync(token);
            var ok = Convert.ToInt32(obj) == 1;

            return ok
                ? HealthCheckResult.Healthy("MariaDB reachable")
                : HealthCheckResult.Unhealthy("Unexpected result from SELECT 1");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MariaDB unreachable", ex);
        }
    }
}
