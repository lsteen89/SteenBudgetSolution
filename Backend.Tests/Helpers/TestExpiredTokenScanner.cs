using Backend.Application.Interfaces.WebSockets;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Backend.Tests.Helpers
{
    public class TestExpiredTokenScanner : ExpiredTokenScanner
    {
        public TestExpiredTokenScanner(IServiceScopeFactory scopeFactory, IWebSocketManager webSocketManager, ILogger<ExpiredTokenScanner> logger)
            : base(scopeFactory, webSocketManager, logger)
        {
        }

        // Expose ExecuteAsync publicly for testing.
        public Task RunAsync(CancellationToken token) => base.ExecuteAsync(token);
    }
}
