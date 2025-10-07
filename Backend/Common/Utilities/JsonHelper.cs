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

        public static readonly JsonSerializerOptions CamelSparse = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            WriteIndented = false,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        static JsonHelper()
        {
            Camel.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
            CamelSparse.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
        }

        public static string SerializeSparse<T>(T value) =>
            JsonSerializer.Serialize(value, CamelSparse);
    }
}
