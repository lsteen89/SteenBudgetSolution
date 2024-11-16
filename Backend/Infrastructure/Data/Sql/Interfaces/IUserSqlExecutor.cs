using Backend.Domain.Entities;

namespace Backend.Infrastructure.Data.Sql.Interfaces
{
    public interface IUserSqlExecutor
    {
        /// <summary>
        /// Checks if a user with the specified email address exists in the database.
        /// </summary>
        /// <param name="email">The email address of the user to check.</param>
        /// <returns>True if the user exists; otherwise, false.</returns>
        Task<bool> IsUserExistInDatabaseAsync(string email);

        /// <summary>
        /// Inserts a new user record into the database.
        /// </summary>
        /// <param name="user">The UserModel object containing the user's details.</param>
        /// <returns>True if the insertion was successful; otherwise, false.</returns>
        Task<bool> InsertNewUserDatabaseAsync(UserModel user);

        /// <summary>
        /// Retrieves a user's information based on the provided PersoId or email address.
        /// </summary>
        /// <param name="persoid">The unique identifier (PersoId) for the user.</param>
        /// <param name="email">The email address of the user.</param>
        /// <returns>The UserModel object if the user is found; otherwise, throws a KeyNotFoundException.</returns>
        /// <exception cref="ArgumentException">Thrown if both PersoId and email are null or empty.</exception>
        Task<UserModel> GetUserModelAsync(Guid? persoid = null, string? email = null);

        /// <summary>
        /// Updates the email confirmation status of a user based on their PersoId.
        /// </summary>
        /// <param name="persoid">The unique identifier (PersoId) of the user.</param>
        /// <returns>True if the update was successful; otherwise, false.</returns>
        Task<bool> UpdateEmailConfirmationStatusAsync(Guid persoid);

        /// <summary>
        /// Deletes a user record from the database based on their email address.
        /// </summary>
        /// <param name="email">The email address of the user to delete.</param>
        /// <returns>The number of rows affected by the deletion.</returns>
        Task<int> DeleteUserByEmailAsync(string email);
    }
}
