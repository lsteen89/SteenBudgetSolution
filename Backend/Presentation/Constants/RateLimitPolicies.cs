namespace Backend.Presentation.Constants;

public static class RateLimitPolicies
{
    public const string Registration = "RegistrationPolicy";
    public const string Login = "LoginPolicy";
    public const string Refresh = "RefreshPolicy";
    public const string Logout = "LogoutPolicy";
    public const string SupportMessageSending = "SupportMessageSending";
    public const string VerifyEmail = "VerifyEmailPolicy";
    public const string ResendVerification = "ResendVerificationPolicy";
    public const string ForgotPassword = "ForgotPasswordPolicy";
    public const string ResetPassword = "ResetPasswordPolicy";
}