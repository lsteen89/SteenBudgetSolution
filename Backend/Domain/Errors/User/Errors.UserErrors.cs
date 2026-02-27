using Backend.Domain.Shared;

namespace Backend.Domain.Errors.User;

public static partial class UserErrors
{
    // --- Validation Errors ---
    public static readonly Error ValidationFailed = new("User.ValidationFailed", "One or more validation errors occurred. Please check your input and try again.");
    // --- General Errors ---
    public static readonly Error GenericError = new("User.GenericError", "An unexpected error occurred. Please try again later.");

    // --- Login Errors ---
    public static readonly Error InvalidChallengeToken = new("Auth.InvalidChallengeToken", "We couldn't verify you're a human. Please try submitting the form again.");
    public static readonly Error UserLockedOut = new("Auth.UserLockedOut", "This account is temporarily locked out.");
    public static readonly Error InvalidCredentials = new("Auth.InvalidCredentials", "The email or password provided is incorrect.");
    public static readonly Error LoginTransactionFailed = new("Auth.LoginFailed", "A server error occurred during login. Please try again.");

    // --- Password Reset Errors ---
    public static readonly Error InvalidPasswordResetToken = new("PasswordReset.InvalidToken", "Invalid or expired token.");
    public static readonly Error SamePassword = new("PasswordReset.SamePassword", "New password cannot be the same as the old password.");
    public static readonly Error PasswordUpdateFailed = new("PasswordReset.UpdateFailed", "Failed to update password. Please try again.");

    // --- Email Verification Errors ---
    public static readonly Error VerificationTokenNotFound = new("Verification.TokenNotFound", "The specified verification token was not found or has already been used.");
    public static readonly Error VerificationTokenExpired = new("Verification.TokenExpired", "The verification token has expired. Please request a new one.");
    public static readonly Error EmailAlreadyVerified = new("Verification.AlreadyVerified", "This email is already verified.");
    public static readonly Error EmailNotConfirmed = new("Verification.EmailNotConfirmed", "Email address is not confirmed.");
    public static readonly Error VerificationUpdateFailed = new("Verification.UpdateFailed", "Email verification failed. Please try again.");

    // --- RefreshToken errors --- 
    public static readonly Error InvalidRefreshToken = new("RefreshToken.InvalidToken", "The refresh token is invalid or has expired.");
    public static readonly Error RefreshTransactionFailed = new("RefreshToken.TransactionFailed", "A server error occurred during token refresh. Please try again.");
    public static readonly Error RefreshUserNotFound = new("RefreshToken.UserNotFound", "The user associated with the refresh token could not be found.");

    // --- Registration Errors ---
    public static readonly Error EmailAlreadyExists = new("Registration.EmailAlreadyExists", "An account with this email already exists.");
    public static readonly Error RegistrationFailed = new("Registration.Failed", "An error occurred while registering the user. Please try again.");
    public static readonly Error InvalidRegistrationData = new("Registration.InvalidData", "The provided registration data is invalid. Please check your input and try again.");
    public static readonly Error HoneypotDetected = new("Registration.HoneypotDetected", "Registration failed"); // Generic error to avoid tipping off bots about honeypot fields
    public static readonly Error InvalidVerificationCode = new("Registration.InvalidVerificationCode", "Registration failed"); // Generic error to not tip off about the validity of verification codes
    public static readonly Error VerificationLocked = new("Registration.VerificationLocked", "Too many failed verification attempts. Please try again later.");
    public static readonly Error VerificationExpired = new("Registration.VerificationExpired", "The verification code has expired. Please request a new one.");
    public static readonly Error SeedingNotAllowed = new("Registration", "Seeding not allowed,");
    // --- Rate Limiting Errors ---
    public static readonly Error RateLimitExceeded = new("RateLimit.Exceeded", "You have exceeded the allowed number of requests. Please try again later.");

    // --- Generic email errors ---
    public static readonly Error EmailSendFailed = new("Email.SendFailed", "An error occurred while sending the email. Please try again later.");
    public static readonly Error EmailTemplateNotFound = new("Email.TemplateNotFound", "The requested email template could not be found.");
    public static readonly Error EmailSendSuccess = new("Email.SendSuccess", "Email sent successfully, but no further action is required.");
    public static readonly Error HumanVerificationRequired = new("Auth.HumanVerificationRequired", "Human verification required.");


}
