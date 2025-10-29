using MySqlConnector;
using Respawn;
using Respawn.Graph;
using Testcontainers.MariaDb;

namespace Backend.IntegrationTests.Shared;

public sealed class MariaDbFixture : IAsyncLifetime
{
  private readonly MariaDbContainer _db = new MariaDbBuilder()
      .WithImage("mariadb:11.4")
      .WithDatabase("ebudget_it")
      .WithUsername("test")
      .WithPassword("test")
      .WithResourceMapping(GetSqlScriptPath(), "/docker-entrypoint-initdb.d")
      .Build();

  private Respawner? _respawner;
  public string ConnectionString => _db.GetConnectionString() + ";GuidFormat=Binary16;OldGuids=false";

  public async Task InitializeAsync()
  {
    await _db.StartAsync();
    await using var conn = new MySqlConnection(ConnectionString);
    await conn.OpenAsync();
    _respawner = await BuildRespawnerAsync(conn);
  }

  public async Task ResetAsync(bool rebuild = true)
  {
    await using var conn = new MySqlConnection(ConnectionString);
    await conn.OpenAsync();

    if (rebuild || _respawner is null)
      _respawner = await BuildRespawnerAsync(conn);

    await _respawner!.ResetAsync(conn);
  }

  public Task DisposeAsync() => _db.DisposeAsync().AsTask();

  private static async Task<Respawner> BuildRespawnerAsync(MySqlConnection conn)
    => await Respawner.CreateAsync(conn, new RespawnerOptions
    {
      DbAdapter = DbAdapter.MySql,
      SchemasToInclude = new[] { conn.Database! },
      TablesToIgnore = Array.Empty<Table>(),
      WithReseed = true
    });

  private static string GetSqlScriptPath()
  {
    var currentDirectory = AppContext.BaseDirectory;
    var directory = new DirectoryInfo(currentDirectory);
    while (directory != null && !directory.GetFiles("*.sln").Any())
      directory = directory.Parent;
    if (directory == null)
      throw new DirectoryNotFoundException("Solution root directory could not be found.");
    return Path.Combine(directory.FullName, "database", "init");
  }
}
