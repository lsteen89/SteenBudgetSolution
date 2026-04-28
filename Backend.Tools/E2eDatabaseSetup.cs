using System.Text;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

public sealed class E2eDatabaseSetup
{
    private const string DefaultDatabaseName = "steenbudgetE2E";
    private readonly IConfiguration _configuration;

    public E2eDatabaseSetup(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    public async Task ResetAsync(CancellationToken ct)
    {
        var appConnectionString = ResolveAppConnectionString(_configuration);
        var appBuilder = new MySqlConnectionStringBuilder(appConnectionString);
        var databaseName = ResolveDatabaseName(_configuration, appBuilder);

        if (!databaseName.Contains("e2e", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Refusing to reset non-E2E database '{databaseName}'. Set E2E_DATABASE_NAME to a database name containing 'e2e'.");
        }

        var adminConnectionString = TryResolveAdminConnectionString(_configuration);
        if (!string.IsNullOrWhiteSpace(adminConnectionString))
        {
            var adminBuilder = new MySqlConnectionStringBuilder(adminConnectionString);
            await RecreateDatabaseAsync(adminBuilder, databaseName, ct);
        }

        appBuilder.Database = databaseName;

        await using var connection = new MySqlConnection(appBuilder.ConnectionString);
        await connection.OpenAsync(ct);

        await ExecuteSchemaAsync(connection, ct);
        Console.WriteLine($"Recreated E2E database schema in {databaseName}.");
    }
    private async Task RecreateDatabaseAsync(
    MySqlConnectionStringBuilder adminBuilder,
    string databaseName,
    CancellationToken ct)
    {
        var bootstrapBuilder = new MySqlConnectionStringBuilder(adminBuilder.ConnectionString)
        {
            Database = string.Empty
        };

        await using var connection = new MySqlConnection(bootstrapBuilder.ConnectionString);
        await connection.OpenAsync(ct);

        await ExecuteNonQueryAsync(
            connection,
            $"DROP DATABASE IF EXISTS {QuoteIdentifier(databaseName)};",
            ct);

        await ExecuteNonQueryAsync(
            connection,
            $"CREATE DATABASE {QuoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            ct);

        await GrantAppUserIfConfiguredAsync(connection, databaseName, ct);
    }

    public static string ResolveE2eConnectionString(IConfiguration configuration)
    {
        var connectionString = ResolveAppConnectionString(configuration);
        var builder = new MySqlConnectionStringBuilder(connectionString);
        builder.Database = ResolveDatabaseName(configuration, builder);
        return builder.ConnectionString;
    }
    private static string ResolveDatabaseName(IConfiguration configuration, MySqlConnectionStringBuilder builder)
    {
        return configuration["E2E_DATABASE_NAME"]
            ?? (string.IsNullOrWhiteSpace(builder.Database) ? DefaultDatabaseName : builder.Database);
    }

    private async Task EnsureDatabaseExistsAsync(
        MySqlConnectionStringBuilder adminBuilder,
        string databaseName,
        CancellationToken ct)
    {
        var bootstrapBuilder = new MySqlConnectionStringBuilder(adminBuilder.ConnectionString)
        {
            Database = string.Empty
        };

        await using var connection = new MySqlConnection(bootstrapBuilder.ConnectionString);
        await connection.OpenAsync(ct);

        await ExecuteNonQueryAsync(
            connection,
            $"CREATE DATABASE IF NOT EXISTS {QuoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
            ct);

        await GrantAppUserIfConfiguredAsync(connection, databaseName, ct);
    }

    private async Task GrantAppUserIfConfiguredAsync(
        MySqlConnection connection,
        string databaseName,
        CancellationToken ct)
    {
        var appUser = _configuration["MARIADB_USER"];
        var appPassword = _configuration["MARIADB_PASSWORD"];

        if (string.IsNullOrWhiteSpace(appUser) || string.IsNullOrWhiteSpace(appPassword))
            return;

        var user = QuoteString(appUser);
        var password = QuoteString(appPassword);
        var database = QuoteIdentifier(databaseName);

        await ExecuteNonQueryAsync(
            connection,
            $"GRANT ALL PRIVILEGES ON {database}.* TO {user}@'%' IDENTIFIED BY {password};",
            ct);
    }

    private static async Task<IReadOnlyList<string>> GetTablesAsync(
        MySqlConnection connection,
        string databaseName,
        CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = @DatabaseName
              AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME;";
        command.Parameters.AddWithValue("@DatabaseName", databaseName);

        var tables = new List<string>();
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            tables.Add(reader.GetString(0));
        }

        return tables;
    }

    private static async Task TruncateTablesAsync(
        MySqlConnection connection,
        IReadOnlyList<string> tables,
        CancellationToken ct)
    {
        await ExecuteNonQueryAsync(connection, "SET FOREIGN_KEY_CHECKS = 0;", ct);
        try
        {
            foreach (var table in tables)
            {
                await ExecuteNonQueryAsync(
                    connection,
                    $"TRUNCATE TABLE {QuoteIdentifier(table)};",
                    ct);
            }
        }
        finally
        {
            await ExecuteNonQueryAsync(connection, "SET FOREIGN_KEY_CHECKS = 1;", CancellationToken.None);
        }
    }

    private static async Task ExecuteSchemaAsync(MySqlConnection connection, CancellationToken ct)
    {
        await ExecuteNonQueryAsync(connection, "DROP FUNCTION IF EXISTS UUID_TO_BIN;", ct);

        foreach (var file in Directory.GetFiles(FindSchemaDirectory(), "*.sql").OrderBy(x => x, StringComparer.Ordinal))
        {
            var sql = await File.ReadAllTextAsync(file, ct);
            foreach (var statement in SplitSqlStatements(sql))
            {
                await ExecuteNonQueryAsync(connection, statement, ct);
            }
        }
    }

    private static string FindSchemaDirectory()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "database", "init");
            if (Directory.Exists(candidate))
                return candidate;

            current = current.Parent;
        }

        throw new DirectoryNotFoundException("Could not find database/init from Backend.Tools output directory.");
    }

    private static IEnumerable<string> SplitSqlStatements(string sql)
    {
        var delimiter = ";";
        var buffer = new StringBuilder();

        using var reader = new StringReader(sql);
        while (reader.ReadLine() is { } line)
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("DELIMITER ", StringComparison.OrdinalIgnoreCase))
            {
                delimiter = trimmed["DELIMITER ".Length..].Trim();
                continue;
            }

            buffer.AppendLine(line);

            var statement = buffer.ToString().Trim();
            if (!statement.EndsWith(delimiter, StringComparison.Ordinal))
                continue;

            statement = statement[..^delimiter.Length].Trim();
            buffer.Clear();

            if (!string.IsNullOrWhiteSpace(statement))
                yield return statement;
        }

        var tail = buffer.ToString().Trim();
        if (!string.IsNullOrWhiteSpace(tail))
            yield return tail;
    }

    private static async Task ExecuteNonQueryAsync(
        MySqlConnection connection,
        string sql,
        CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync(ct);
    }

    private static string QuoteIdentifier(string value)
    {
        return $"`{value.Replace("`", "``", StringComparison.Ordinal)}`";
    }

    private static string QuoteString(string value)
    {
        return $"'{value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("'", "''", StringComparison.Ordinal)}'";
    }
    private static string? TryResolveAdminConnectionString(IConfiguration configuration)
    {
        return configuration["E2E_DATABASESETTINGS:CONNECTIONSTRING"]
            ?? configuration["E2E_DATABASE_CONNECTIONSTRING"];
    }

    private static string ResolveAppConnectionString(IConfiguration configuration)
    {
        var connectionString =
            configuration["DatabaseSettings:ConnectionString"]
            ?? configuration["ConnectionStrings:Default"];

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Missing app connection string. Provide DATABASESETTINGS__CONNECTIONSTRING or DatabaseSettings:ConnectionString.");
        }

        return connectionString;
    }
}
