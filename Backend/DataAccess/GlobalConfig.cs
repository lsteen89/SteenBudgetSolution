using System.Data.SqlClient;
using System.Data;

public class GlobalConfig
{
    private static IConfiguration _configuration;

    public static void Initialize(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public static IDbConnection GetConnection()
    {
        var connectionString = _configuration.GetConnectionString("BudgetDatabase");
        IDbConnection connection = new SqlConnection(connectionString);
        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }
        return connection;
    }
}