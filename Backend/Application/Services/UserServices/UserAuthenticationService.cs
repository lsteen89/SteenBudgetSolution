using Backend.Application.DTO;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Interfaces;
using Backend.Infrastructure.Security;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Models;

namespace Backend.Application.Services.UserServices
{
    public class UserAuthenticationService : IUserAuthenticationService
    {
        private readonly IUserSqlExecutor _userSqlExecutor;
        private readonly ITokenService _tokenService; 
        private readonly IEnvironmentService _environmentService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<UserAuthenticationService> _logger;

        public UserAuthenticationService(
            IUserSqlExecutor userSqlExecutor,
            ITokenService tokenService,
            IEnvironmentService environmentService,
            IHttpContextAccessor httpContextAccessor,
            ILogger<UserAuthenticationService> logger)
        {
            _userSqlExecutor = userSqlExecutor;
            _tokenService = tokenService;
            _environmentService = environmentService;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<ValidationResult> ValidateCredentialsAsync(string email, string password)
        {
            var user = await _userSqlExecutor.GetUserModelAsync(email: email);
            if (user == null) return new ValidationResult(false, "Felaktiga uppgifter");
            if (!user.EmailConfirmed) return new ValidationResult(false, "E-post ej bekräftad");
            if (!BCrypt.Net.BCrypt.Verify(password, user.Password)) return new ValidationResult(false, "Felaktiga uppgifter");
            return new ValidationResult(true);
        }

        public async Task<LoginResultDto> LoginAsync(string email)
        {
            var user = await _userSqlExecutor.GetUserModelAsync(email: email);
            if (user == null)
            {
                _logger.LogWarning("User not found for login: {Email}", email);
                return new LoginResultDto { Success = false, Message = "Invalid credentials" };
            }
            if (_httpContextAccessor.HttpContext == null)
            {
                throw new InvalidOperationException("HttpContext is not available.");
            }

            _logger.LogInformation("Environment service instance type: {Type}", _environmentService.GetType().FullName);

            var token = _tokenService.GenerateJwtToken(user.PersoId.ToString(), email);
            var environment = _environmentService.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                               ?? "Development";
            _logger.LogInformation("Resolved environment: {Environment}", environment);
            var isSecure = environment.ToLower() == "production";

            _httpContextAccessor.HttpContext.Response.Cookies.Append("auth_token", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = isSecure,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddHours(1)
            });

            _logger.LogInformation("Cookie auth_token appended with token: {Token}", token);
            _logger.LogInformation("Auth token cookie set: {Token}", token);
            return new LoginResultDto { Success = true, Message = "Login successful", UserName = user.Email, Token = token };
        }
    }
}
