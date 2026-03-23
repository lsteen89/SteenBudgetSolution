namespace Backend.Application.DTO.User;


public sealed record ForgotPasswordRequest(string Email, string? Locale);
public sealed record ResetPasswordRequest(
    string Email,
    string Code,
    string NewPassword,
    string ConfirmPassword
);