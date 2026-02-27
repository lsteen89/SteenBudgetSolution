using Backend.Application.Common.Security;
namespace Backend.Application.Orchestrators.Email.Generators;

public sealed class RandomVerificationCodeGenerator : IVerificationCodeGenerator
{
    public string New6Digits() => VerificationCode.New6Digits();
}
