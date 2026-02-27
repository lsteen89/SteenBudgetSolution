namespace Backend.Application.DTO.Email;

public sealed record VerifyEmailCodeRequest(string Email, string Code);
