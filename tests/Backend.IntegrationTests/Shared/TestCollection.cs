using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace Backend.IntegrationTests.Shared;

[CollectionDefinition("it:db")]
public sealed class DbCollection : ICollectionFixture<MariaDbFixture> { }
