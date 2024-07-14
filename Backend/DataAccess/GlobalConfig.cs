using System.Data;
using MySqlConnector;
using Microsoft.Extensions.Configuration;

public class GlobalConfig
{
    private static IConfiguration _configuration;

    public static void Initialize(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public static IDbConnection GetConnection()
    {
        var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");

        // If the environment variable is not set, throw exception
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("Database connection string not configured in environment variables.");
        }

        IDbConnection connection = new MySqlConnection(connectionString);
        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }
        return connection;
    }
}
