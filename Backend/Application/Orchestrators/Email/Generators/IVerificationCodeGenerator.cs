namespace Backend.Application.Orchestrators.Email.Generators;

public interface IVerificationCodeGenerator
{
    string New6Digits();
}
