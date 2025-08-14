using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.Auth
{
    public class AuthStatusDto
    {
        [JsonPropertyName("authenticated")]
        public bool Authenticated { get; set; }
        [JsonPropertyName("email")]
        [Required]
        public required string Email { get; set; }
        [JsonPropertyName("role")]
        [Required]
        public required string Role { get; set; }
        [JsonPropertyName("firstTimeLogin")]
        public bool FirstTimeLogin { get; set; }
    }
}
