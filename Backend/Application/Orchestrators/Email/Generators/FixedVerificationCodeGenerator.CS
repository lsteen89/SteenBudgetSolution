namespace Backend.Application.Orchestrators.Email.Generators;

public sealed class FixedVerificationCodeGenerator : IVerificationCodeGenerator
{
    public string New6Digits() => "123456";
}
