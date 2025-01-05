using Backend.Domain.Entities;

namespace Backend.Infrastructure.Data.Sql.Interfaces
{
    public interface ITokenSqlExecutor
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
        Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel);

        /// <summary>
        /// Retrieves a verification token by the user's PersoId.
        /// </summary>
        /// <param name="persoid">The unique identifier for the user.</param>
        /// <returns>A UserTokenModel if found, otherwise null.</returns>
        Task<UserTokenModel?> GetUserVerificationTokenByPersoIdAsync(Guid persoid);

        /// <summary>
        /// Retrieves a verification token by the token value.
        /// </summary>
        /// <param name="token">The unique token identifier.</param>
        /// <returns>A UserTokenModel if found, otherwise null.</returns>
        Task<UserTokenModel?> GetUserVerificationTokenByTokenAsync(Guid token);

        /// <summary>
        /// Retrieves the user's verification tracking information.
        /// </summary>
        /// <param name="persoId">The unique identifier for the user.</param>
        /// <returns>A UserVerificationTrackingModel with the tracking information.</returns>
        Task<UserVerificationTrackingModel> GetUserVerificationTrackingAsync(Guid persoId);

        /// <summary>
        /// Inserts a new verification tracking record for a user.
        /// </summary>
        /// <param name="tracking">The tracking model to insert.</param>
        Task InsertUserVerificationTrackingAsync(UserVerificationTrackingModel tracking);

        /// <summary>
        /// Updates an existing verification tracking record for a user.
        /// </summary>
        /// <param name="tracking">The tracking model to update.</param>
        Task UpdateUserVerificationTrackingAsync(UserVerificationTrackingModel tracking);

        /// <summary>
        /// Deletes a user token by the user's PersoId.
        /// </summary>
        /// <param name="persoid">The unique identifier for the user.</param>
        /// <returns>The number of rows affected by the deletion.</returns>
        Task<int> DeleteUserTokenByPersoidAsync(Guid persoid);
        Task SaveResetTokenAsync(Guid persoId, Guid token);
        Task<bool> ValidateResetTokenAsync(Guid token);
        Task<UserModel> GetUserFromResetTokenAsync(Guid token);
        Task<IEnumerable<UserTokenModel>> GetResetTokensByPersoIdAsync(Guid persoId);
    }
}
