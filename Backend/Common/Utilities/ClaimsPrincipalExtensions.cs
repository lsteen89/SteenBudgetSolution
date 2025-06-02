using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Common.Utilities
{
        public static class ClaimsPrincipalExtensions
        {
        /// <summary>
        /// Gets the user's Persoid (User ID) from the 'sub' (Subject) claim.
        /// </summary>
        /// <param name="user">The ClaimsPrincipal.</param>
        /// <returns>The user's Persoid as a Guid, or null if the claim is not found or invalid.</returns>
        public static Guid? GetPersoid(this ClaimsPrincipal user)
        {
            if (user == null)
                return null;

            // The 'sub' claim stores the Persoid as a string
            var persoidString = user.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (Guid.TryParse(persoidString, out Guid persoid))
            {
                return persoid;
            }

            return null;
        }

        /// <summary>
        /// Gets the user's email from the standard 'email' claim (JwtRegisteredClaimNames.Email).
        /// </summary>
        /// <param name="user">The ClaimsPrincipal.</param>
        /// <returns>The user's email address, or null if the claim is not found.</returns>
        public static string? GetEmail(this ClaimsPrincipal user)
        {
            if (user == null)
                return null;

            return user.FindFirstValue(JwtRegisteredClaimNames.Email);
        }


        public static Guid? GetSessionIdClaim(this ClaimsPrincipal user)
        {
            if (user == null)
                return null;

            var sessionIdString = user.FindFirstValue("sessionId");

            if (Guid.TryParse(sessionIdString, out Guid sessionId))
                return sessionId;

            return null;
        }

    }
}
