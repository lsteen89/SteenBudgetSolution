using System.Text.Json;
using System.Text.Json.Serialization;

namespace Backend.Common.Utilities
{
    public class JsonHelper
    {
        public static readonly JsonSerializerOptions Camel = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };

        static JsonHelper()
        {
            Camel.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
        }
    }
}
