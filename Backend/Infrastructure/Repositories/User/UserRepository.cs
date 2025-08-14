using Backend.Domain.Entities.User;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;

namespace Backend.Infrastructure.Repositories.User;

public class UserRepository : SqlBase, IUserRepository
{

    public UserRepository(IUnitOfWork unitOfWork, ILogger<UserRepository> logger)
        : base(unitOfWork, logger) { }

    public async Task<bool> UserExistsAsync(string email, CancellationToken ct = default)
    {
        const string sql = "SELECT EXISTS(SELECT 1 FROM Users WHERE Email = @Email)";
        return await ExecuteScalarAsync<bool>(sql, new { Email = email }, ct);
    }
    public async Task<bool> CreateUserAsync(UserModel user, CancellationToken ct = default)
    {
        const string sql = @"
            INSERT INTO users (PersoId, Firstname, Lastname, Email, Password, Roles, CreatedBy)
            VALUES (@PersoId, @Firstname, @Lastname, @Email, @Password, @Roles, 'System');";

        _logger.LogInformation("Inserting user {Email}", user.Email);
        var rows = await ExecuteAsync(sql, new
        {
            user.PersoId,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Password,
            user.Roles
        }, ct);
        _logger.LogInformation("Insert completed. Rows affected: {Rows}", rows);
        return rows == 1;
    }

    public async Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct = default)
    {
        const string sql = "UPDATE Users SET EmailConfirmed = 1 WHERE PersoId = @PersoId;";
        return await QueryFirstOrDefaultAsync<bool>(sql, new { PersoId = persoid }, ct);
    }
    public Task<UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default)
    {
        if (persoid is null && string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Either PersoId or Email must be provided.");

        const string byId = "SELECT * FROM Users WHERE PersoId  = @PersoId  LIMIT 1;";
        const string byEmail = "SELECT * FROM Users WHERE Email = @Email    LIMIT 1;";

        return persoid is not null
            ? QueryFirstOrDefaultAsync<UserModel>(byId, new { PersoId = persoid }, ct)
            : QueryFirstOrDefaultAsync<UserModel>(byEmail, new { Email = email!.Trim() }, ct);
    }
}