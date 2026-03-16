using Backend.Application.Common.Behaviors;
using Backend.Application.Features.Support.Contact;
using NetArchTest.Rules;

namespace Backend.UnitTests.Architecture;

public class CommandTests
{
    [Fact]
    public void All_Commands_Must_Implement_ITransactionalCommand()
    {
        var assembly = typeof(SendSupportMessageCommand).Assembly;

        var result = Types.InAssembly(assembly)
            .That()
            .AreNotAbstract()
            .And()
            .HaveNameEndingWith("Command")
            .Should()
            .ImplementInterface(typeof(ITransactionalCommand))
            .GetResult();

        Assert.True(
            result.IsSuccessful,
            $"The following commands are missing ITransactionalCommand: {string.Join(", ", result.FailingTypes?.Select(t => t.Name) ?? Array.Empty<string>())}");
    }
}