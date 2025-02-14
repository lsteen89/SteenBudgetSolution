using Backend.Application.DTO;
using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.UserServices;
using Backend.Domain.Entities;
using Backend.Domain.Shared;
using Backend.Infrastructure.Data.Sql.Interfaces;
public class UserServices : IUserServices
{
    private readonly IUserManagementService _userManagementService;
    private readonly IUserTokenService _userTokenService;
    private readonly IUserEmailService _userEmailService;
    private readonly IEmailVerificationService _emailVerificationService;
    private readonly IUserAuthenticationService _userAuthenticationService;
    private readonly IUserSQLProvider userSQLProvider;
    private readonly ILogger<UserServices> _logger;

    public UserServices(
        IUserManagementService userManagementService,
        IUserTokenService userTokenService,
        IUserEmailService userEmailService,
        IEmailVerificationService emailVerificationService,
        IUserAuthenticationService userAuthenticationService,
        IUserSQLProvider userSQLProvider,
        
        ILogger<UserServices> logger)
    {
        _userManagementService = userManagementService;
        _userTokenService = userTokenService;
        _userEmailService = userEmailService;
        _emailVerificationService = emailVerificationService;
        _userAuthenticationService = userAuthenticationService;
        this.userSQLProvider = userSQLProvider;
        _logger = logger;
    }

    public async Task<bool> RegisterUserAsync(UserCreationDto userCreationDto)
    {
        if (userCreationDto.Email is null)
        {
            _logger.LogWarning("Registration attempt with null email");
            return false;
        }

        if (await _userManagementService.CheckIfUserExistsAsync(userCreationDto.Email))
        {
            _logger.LogWarning("User already exists: {Email}", userCreationDto.Email);
            return false;
        }

        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(userCreationDto.Password);
        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            Roles = "1", // default role
            FirstName = userCreationDto.FirstName,
            LastName = userCreationDto.LastName,
            Email = userCreationDto.Email,
            Password = hashedPassword,
        };

        var success = await _userManagementService.CreateUserAsync(user);
        if (!success)
        {
            _logger.LogError("Failed to create user for email: {Email}", userCreationDto.Email);
            return false;
        }

        _logger.LogInformation("User registered successfully for email: {Email}", userCreationDto.Email);
        return true;
    }

    public async Task<bool> SendVerificationEmailWithTokenAsync(string email)
    {
        var user = await _userManagementService.GetUserByEmailAsync(email);
        if (user == null)
        {
            _logger.LogError("User not found for email: {Email}", email);
            return false;
        }

        var emailSent = await _emailVerificationService.SendVerificationEmailWithTokenAsync(user.Email);
        if (!emailSent)
        {
            _logger.LogError("Failed to send verification email for: {Email}", user.Email);
            return false;
        }

        _logger.LogInformation("Verification email sent successfully for: {Email}", email);
        return true;
    }

    public async Task<OperationResult> VerifyEmailTokenAsync(Guid token)
    {
        var tokenData = await _userTokenService.GetTokenByGuidAsync(token);
        if (tokenData == null || tokenData.TokenExpiryDate < DateTime.UtcNow)
        {
            _logger.LogWarning("Invalid or expired token: {Token}", token);
            return OperationResult.FailureResult(Messages.EmailVerification.VerificationFailed, 400);
        }

        bool isAlreadyVerified = await _userManagementService.IsEmailAlreadyConfirmedAsync(tokenData.PersoId);
        if (isAlreadyVerified)
        {
            _logger.LogWarning("Email is already verified for PersoId: {PersoId}", tokenData.PersoId);
            return OperationResult.FailureResult(Messages.EmailVerification.AlreadyVerified, 400);
        }

        int updated = await _userManagementService.UpdateEmailConfirmationAsync(tokenData.PersoId);
        if (updated <= 0)
        {
            _logger.LogError("Failed to update email confirmation for PersoId: {PersoId}", tokenData.PersoId);
            return OperationResult.FailureResult(Messages.EmailVerification.VerificationFailed, 500);
        }

        return OperationResult.SuccessResult(Messages.EmailVerification.VerificationSuccessful);
    }

    public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
    {
        return await _userEmailService.ResendVerificationEmailAsync(email);
    }

    public async Task<bool> DeleteUserByEmailAsync(string email) =>
        await _userManagementService.GetUserByEmailAsync(email) is UserModel user && await userSQLProvider.UserSqlExecutor.DeleteUserByEmailAsync(email) > 0;

    public async Task<bool> DeleteUserTokenByEmailAsync(Guid persoid) =>
        await _userTokenService.DeleteTokenByPersoidAsync(persoid);
}
