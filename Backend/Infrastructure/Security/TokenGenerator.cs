// This class is used to generate a refresh token for the user. The refresh token is used to generate a new access token when the current access token expires.
// The refresh token is stored in the database and is hashed for security reasons. The refresh token is generated using a cryptographically secure random number generator and is converted to Base64 for ease of storage and transmission.
// The token can be hashed using SHA256 for secure storage.


// Named it TokenGenerator.cs because the scoope might be expanded to include other token generation methods

using System.Security.Cryptography;
using System.Text;

namespace Backend.Infrastructure.Security
{
    public static class TokenGenerator
    {
        // Generate a refresh token
        public static string GenerateRefreshToken(int size = 32)
        {
            // Generate a cryptographically secure random token
            var randomBytes = new byte[size];
            RandomNumberGenerator.Fill(randomBytes);
            // Convert to Base64 for ease of storage/transmission
            return Convert.ToBase64String(randomBytes);
        }
        // Hash the token using SHA256
        public static string HashToken(string token)
        {
            using (var sha256 = SHA256.Create())
            {
                var tokenBytes = Encoding.UTF8.GetBytes(token);
                var hashBytes = sha256.ComputeHash(tokenBytes);
                return Convert.ToBase64String(hashBytes);
            }
        }
    }
}
