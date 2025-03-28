// Token in this context is usertoken for reset password and email verification
// NOT to be confused with JWT token


// Token in this context is usertoken for reset password and email verification
// NOT to be confused with JWT token

using Backend.Domain.Entities.Auth;
using Backend.Domain.Entities.User;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.UserQueries
{
    public interface IVerificationTokenSqlExecutor
    {
        /// <summary>
        /// Generates a new token for a user, returning a populated UserTokenModel.
        /// </summary>
        /// <param name="persoId">The unique identifier for the user.</param>
        /// <returns>A UserTokenModel with the generated token details.</returns>
        Task<UserTokenModel> GenerateUserTokenAsync(Guid persoId);

        /// <summary>
        /// Inserts a new user verification token into the database.
        /// </summary>
        /// <param name="tokenModel">The token model containing token details to insert.</param>
        /// <returns>True if insertion was successful, otherwise false.</returns>
        Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel, DbConnection? conn = null, DbTransaction? tx = null);

        /// <summary>
        /// Retrieves a verification token by the user's PersoId.
        /// </summary>
        /// <param name="persoid">The unique identifier for the user.</param>
        /// <returns>A UserTokenModel if found, otherwise null.</returns>
        Task<UserTokenModel?> GetUserVerificationTokenByPersoIdAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null);

        /// <summary>
        /// Retrieves a verification token by the token value.
        /// </summary>
        /// <param name="token">The unique token identifier.</param>
        /// <returns>A UserTokenModel if found, otherwise null.</returns>
        Task<UserTokenModel?> GetUserVerificationTokenByTokenAsync(Guid token, DbConnection? conn = null, DbTransaction? tx = null);

        /// <summary>
        /// Retrieves the user's verification tracking information.
        /// </summary>
        /// <param name="persoId">The unique identifier for the user.</param>
        /// <returns>A UserVerificationTrackingModel with the tracking information.</returns>
        Task<UserVerificationTrackingModel> GetUserVerificationTrackingAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null);

        /// <summary>
        /// Inserts a new verification tracking record for a user.
        /// </summary>
        /// <param name="tracking">The tracking model to insert.</param>
        Task InsertUserVerificationTrackingAsync(UserVerificationTrackingModel tracking, DbConnection? conn = null, DbTransaction? tx = null);

        /// <summary>
        /// Updates an existing verification tracking record for a user.
        /// </summary>
        /// <param name="tracking">The tracking model to update.</param>
        Task UpdateUserVerificationTrackingAsync(UserVerificationTrackingModel tracking, DbConnection? conn = null, DbTransaction? tx = null);

        /// <summary>
        /// Deletes a user token by the user's PersoId.
        /// </summary>
        /// <param name="persoid">The unique identifier for the user.</param>
        /// <returns>The number of rows affected by the deletion.</returns>
        Task<int> DeleteUserTokenByPersoidAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null);
        Task SaveResetTokenAsync(Guid persoId, Guid token, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> ValidateResetTokenAsync(Guid token, DbConnection? conn = null, DbTransaction? tx = null);
        Task<UserModel> GetUserFromResetTokenAsync(Guid token, DbConnection? conn = null, DbTransaction? tx = null);
        Task<IEnumerable<UserTokenModel>> GetResetTokensByPersoIdAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null);
    }
}
