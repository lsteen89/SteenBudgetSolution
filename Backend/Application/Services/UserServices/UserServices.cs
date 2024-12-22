using Backend.Application.DTO;
using Backend.Domain.Entities;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.EmailServices;
using Backend.Infrastructure.Data.Sql.Interfaces;
public class UserServices : IUserServices
{
    private readonly IUserManagementService _userManagementService;
    private readonly IUserTokenService _userTokenService;
    private readonly IUserEmailService _userEmailService;
    private readonly IEmailVerificationService _emailVerificationService;
    private readonly IUserAuthenticationService _userAuthenticationService;
    private readonly IUserSqlExecutor userSqlExecutor;
    private readonly ILogger<UserServices> _logger;

    public UserServices(
        IUserManagementService userManagementService,
        IUserTokenService userTokenService,
        IUserEmailService userEmailService,
        IEmailVerificationService emailVerificationService,
        IUserAuthenticationService userAuthenticationService,
        IUserSqlExecutor userSqlExecutor,
        ILogger<UserServices> logger)
    {
        _userManagementService = userManagementService;
        _userTokenService = userTokenService;
        _userEmailService = userEmailService;
        _emailVerificationService = emailVerificationService;
        _userAuthenticationService = userAuthenticationService;
        this.userSqlExecutor = userSqlExecutor;
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

    public async Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto)
    {
        var validation = await _userAuthenticationService.ValidateCredentialsAsync(userLoginDto.Email, userLoginDto.Password);
        if (!validation.IsValid)
        {
            _logger.LogWarning("Invalid credentials for: {Email}", userLoginDto.Email);
            return new LoginResultDto { Success = false, Message = validation.ErrorMessage };
        }

        return await _userAuthenticationService.LoginAsync(userLoginDto.Email);
    }

    public async Task<bool> VerifyEmailTokenAsync(Guid token)
    {
        var tokenData = await _userTokenService.GetTokenByGuidAsync(token);
        if (tokenData == null || tokenData.TokenExpiryDate < DateTime.UtcNow)
        {
            _logger.LogWarning("Invalid or expired token: {Token}", token);
            return false;
        }

        var updated = await _userManagementService.UpdateEmailConfirmationAsync(tokenData.PersoId);
        if (!updated)
        {
            _logger.LogError("Failed to update email confirmation for: {PersoId}", tokenData.PersoId);
            return false;
        }

        return true;
    }

    public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
    {
        return await _userEmailService.ResendVerificationEmailAsync(email);
    }

    public async Task<bool> DeleteUserByEmailAsync(string email) =>
        await _userManagementService.GetUserByEmailAsync(email) is UserModel user && await userSqlExecutor.DeleteUserByEmailAsync(email) > 0;

    public async Task<bool> DeleteUserTokenByEmailAsync(Guid persoid) =>
        await _userTokenService.DeleteTokenByPersoidAsync(persoid);
}
