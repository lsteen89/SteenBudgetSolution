using System.ComponentModel.DataAnnotations;

namespace Backend.Infrastructure.Entities.Tokens
{
    public class BlacklistedTokenEntity
    {
        public int Id { get; set; }
        [Required]
        public required string Jti { get; set; }
        public DateTime ExpiryDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
