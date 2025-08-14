using Xunit;

namespace Backend.Tests.Fixtures
{
    [CollectionDefinition("WebSocket Test Collection")]
    public class WebSocketTestCollection : ICollectionFixture<WebSocketFixture>
    {
        // This class has no code, and is never created. Its purpose is solely
        // to be the place to apply [CollectionDefinition] and all the
        // ICollectionFixture<> interfaces.
    }
}