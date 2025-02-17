using System.Text.Json.Serialization;

namespace Backend.Application.DTO
{
    public class AuthStatusDto
    {
        [JsonPropertyName("authenticated")]
        public bool Authenticated { get; set; }
        [JsonPropertyName("email")]
        public string Email { get; set; }
        [JsonPropertyName("role")]
        public string Role { get; set; }
        [JsonPropertyName("firstTimeLogin")]
        public bool FirstTimeLogin { get; set; }
    }
}
