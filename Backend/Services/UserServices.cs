using Backend.Controllers;
using Backend.DataAccess;
using Backend.DTO;
using Backend.Helpers;
using Backend.Helpers.Converters;
using Backend.Models;
using System.Data.Common;
using System.Transactions;

namespace Backend.Services
{
    public class UserServices
    {
        private readonly SqlExecutor _sqlExecutor;
        private readonly string? _jwtSecretKey;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly UserVerificationHelper _userVerificationHelper;
        private readonly ILogger<RegistrationController> _logger;

        public UserServices(SqlExecutor sqlExecutor, IConfiguration configuration, IEmailService emailService, ILogger<RegistrationController> logger, UserVerificationHelper userVerificationHelper)
        {
            _sqlExecutor = sqlExecutor;
            _configuration = configuration;
            _emailService = emailService;
            _userVerificationHelper = userVerificationHelper;
        }
        // Method for registering a new user
        public async Task<bool> RegisterUserAsync(UserCreationDto userCreationDto)
        {
            // Step 1: Check if user already exists
            if (await CheckIfUserExistsAsync(userCreationDto.Email))
            {
                _logger.LogWarning("Registration attempt with already taken email: {Email}", userCreationDto.Email);
                return false;
            }
            else if(userCreationDto.Email == null) {
                _logger.LogWarning("Registration attempt with null email");
                return false;
            }

            // Step 2: Create Password Hash and Persoid and assign roles
            _logger.LogInformation("Hashing password for user: {Email}", userCreationDto.Email);
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(userCreationDto.Password);
            var userPersoId = Guid.NewGuid();
            var roles =  "1"; // Assigning default role TODO: this should be configurable somehow

            var user = new UserModel
            {
                PersoId = userPersoId,
                Roles = roles,
                FirstName = userCreationDto.FirstName,
                LastName = userCreationDto.LastName,
                Email = userCreationDto.Email,
                Password = hashedPassword,
            };
            var isSuccessfulRegistration = await CreateNewRegisteredUserAsync(user);
            if (!isSuccessfulRegistration)
            {
                _logger.LogError("Failed to register user for email: {Email}", user.Email);
                return false;
            }

            _logger.LogInformation("User registered successfully for email: {Email}", user.Email);
            return true;
        }
        // Method responsible for the flow of getting token and sending verification email with token
        public async Task<bool> SendVerificationEmailWithTokenAsync(string email)
        {
            // Step 1: Get user model
            UserModel user = await GetUserModelAsync(email: email);
            if (user == null)
            {
                _logger.LogError("Failed to get user for email: {Email}", email);
                return false;
            }

            // Step 2: Create token for user
            var tokenModel = await CreateEmailTokenAsync(user.PersoId);

            // Step 3: Insert token into database
            bool insertationSuccess = await InsertUserTokenAsync(tokenModel);
            if (!insertationSuccess)
            {
                _logger.LogError("Failed to insert token for email: {Email}", user.Email);
                return false;
            }

            // Step 4: Send verification email
            EmailMessageModel emailMessageModel = new EmailMessageModel
            {
                Recipient = user.Email,
                Token = tokenModel.Token,
                EmailType = EmailType.Verification
            };
            bool emailSent = await _emailService.ProcessAndSendEmailAsync(emailMessageModel);
            if (!emailSent)
            {
                _logger.LogError("Failed to send verification email for email: {Email}", user.Email);
                return false;
            }
            _logger.LogInformation("Verification email and token generated successfully for email: {Email}", email);
            return true;
        }
        private async Task<bool> CreateNewRegisteredUserAsync(UserModel user)
        {
            return await _sqlExecutor.InsertNewUserDatabaseAsync(user);
        }
        public async Task<bool> CheckIfUserExistsAsync(string email)
        {
            return await _sqlExecutor.IsUserExistInDatabaseAsync(email);
        }
        public async Task<UserModel> GetUserModelAsync(Guid? persoid = null, string? email = null)
        {
            if (persoid == null && email == null)
            {
                throw new ArgumentException("Either persoid or email must be provided.");
            }

            return persoid != null
                ? await _sqlExecutor.GetUserModelAsync(persoid: persoid)
                : await _sqlExecutor.GetUserModelAsync(email: email);
        }
        public async Task<bool> UpdateEmailConfirmationStatusAsync(Guid persoid)
        {
            return await _sqlExecutor.UpdateEmailConfirmationStatusAsync(persoid);
        }
        public async Task<UserTokenModel?> GetUserVerificationTokenDataAsync(Guid? persoid = null, string? token = null)
        {
            return await _sqlExecutor.GetUserVerificationTokenDataAsync(persoid: persoid, token: token);
        }
        public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
        {
            return await _userVerificationHelper.ResendVerificationEmailAsync(email);
        }
        public async Task<UserTokenModel> CreateEmailTokenAsync(Guid persoid)
        {
            // Generate token for user
            var tokenModel = await _sqlExecutor.GenerateUserTokenAsync(persoid);
            return tokenModel;
        }
        public async Task<bool> InsertUserTokenAsync (UserTokenModel tokenModel)
        {
            bool insertationSuccess = await _sqlExecutor.InsertUserTokenAsync(tokenModel);
            return insertationSuccess;
        }
        public async Task<bool> VerifyEmailTokenAsync(string token)
        {
            // step 1: Get token data
            var tokenData = await GetUserVerificationTokenDataAsync(token: token);

            // Step 2: Check if token is valid
            if (tokenData == null)
            {
                _logger.LogWarning("Token not found or invalid for token: {Token}", token);
                return false;
            }
            if (tokenData.TokenExpiryDate < DateTime.UtcNow)
            {
                _logger.LogWarning("Token expired for PersoId: {PersoId}", tokenData.PersoId);
                return false;
            }

            // step 3: Update user email confirmation status
            bool updateSuccesful = await UpdateEmailConfirmationStatusAsync(tokenData.PersoId);
            if (!updateSuccesful)
            {
                _logger.LogError("Failed to update email confirmation status for Persoid: {Persoid}", tokenData.PersoId);
                return false;
            }
            return true;
        }
        public async Task<bool> DeleteUserByEmailAsync(string email)
        {
            var rowsAffected = await _sqlExecutor.DeleteUserByEmailAsync(email);
            return rowsAffected > 0; 
        }
        public async Task<bool> DeleteUserTokenByEmailAsync(Guid persoid)
        {
            var rowsAffected = await _sqlExecutor.DeleteUserTokenByPersoidAsync(persoid);
            return rowsAffected > 0;
        }

    }
}
