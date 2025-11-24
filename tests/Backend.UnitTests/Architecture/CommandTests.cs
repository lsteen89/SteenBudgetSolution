using Backend.Application.Common.Behaviors;
using Backend.Application.Features.Contact;
using NetArchTest.Rules;

namespace Backend.UnitTests.Architecture;

public class CommandTests
{
    [Fact]
    public void All_Commands_Must_Implement_ITransactionalCommand()
    {
        // 1. Load the Application Assembly
        var assembly = typeof(SendContactFormCommand).Assembly;

        // 2. Define the rule
        var result = Types.InAssembly(assembly)
            .That()
            .AreNotAbstract()
            .And()
            .HaveNameEndingWith("Command")
            .Should()
            .ImplementInterface(typeof(ITransactionalCommand))
            .GetResult();

        // 3. Assert
        // FailingTypes returns a list of classes violating the rule
        Assert.True(result.IsSuccessful,
            $"The following commands are missing ITransactionalCommand: {string.Join(", ", result.FailingTypes?.Select(t => t.Name) ?? Array.Empty<string>())}");
    }
}