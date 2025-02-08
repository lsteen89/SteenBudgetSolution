using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Backend.Tests.Helpers
{
    public static class AuthTestHelper
    {
        public static (string IpAddress, string DeviceId, string UserAgent) GetDefaultMetadata()
        {
            return ("127.0.0.1", "test-device", "test-user-agent");
        }
    }
}
