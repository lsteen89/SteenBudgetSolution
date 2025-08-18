using Xunit;
namespace Backend.IntegrationTests.Shared;

[CollectionDefinition("it:db")]
public sealed class DbCollection : ICollectionFixture<MariaDbFixture> { }
