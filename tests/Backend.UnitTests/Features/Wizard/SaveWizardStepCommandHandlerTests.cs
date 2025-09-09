using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;

using Backend.Domain.Shared;
using Backend.Application.Abstractions.Infrastructure.Data; // IWizardRepository
using Backend.Application.Features.Wizard.SaveStep;

namespace Backend.UnitTests.Features.Wizard;

public sealed class SaveWizardStepCommandHandlerTests
{
    private sealed class FakeValidator : IWizardStepValidator
    {
        public int StepNumber { get; }

        // 1. Change the private field from a string to a function
        private readonly Func<object, Result<string>> _validationFunc;

        // 2. Update the constructor to accept that function
        public FakeValidator(int step, Func<object, Result<string>> validationFunc)
        {
            StepNumber = step;
            _validationFunc = validationFunc;
        }

        // 3. The method now invokes the function it was given
        public Result<string> ValidateAndSerialize(object stepData) => _validationFunc(stepData);
    }

    [Fact]
    public async Task Missing_Validator_Returns_Error_And_Does_Not_Call_Repo()
    {
        var repo = new Mock<IWizardRepository>(MockBehavior.Strict);
        var sut = new SaveWizardStepCommandHandler(repo.Object, Array.Empty<IWizardStepValidator>());

        var cmd = new SaveWizardStepCommand(Guid.NewGuid(), 99, 0, new { }, 1);
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error!.Code.Should().Be("Wizard.ValidatorNotFound");
        repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Validation_Failure_Bubbles_Error_And_Does_Not_Call_Repo()
    {
        var repo = new Mock<IWizardRepository>(MockBehavior.Strict);
        var failingValidator = new FakeValidator(1,
            _ => Result<string>.Failure(new Error("Validation.Failed", "Something was wrong with the input.")));
        var sut = new SaveWizardStepCommandHandler(repo.Object, new[] { failingValidator });

        var cmd = new SaveWizardStepCommand(Guid.NewGuid(), 1, 0, new { }, 1);
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error!.Code.Should().Be("Validation.Failed");
        repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Success_Calls_Repo_With_Correct_Args_And_Returns_Success()
    {
        var repo = new Mock<IWizardRepository>();
        var json = """{"ok":true}""";

        var successValidator = new FakeValidator(1, _ => Result<string>.Success(json));

        var sut = new SaveWizardStepCommandHandler(repo.Object, new[] { successValidator });

        var sid = Guid.NewGuid();
        var cmd = new SaveWizardStepCommand(sid, 1, 2, new { any = "data" }, 3);

        repo.Setup(r => r.UpsertStepDataAsync(
                sid, 1, 2, json, 3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        repo.VerifyAll();
    }

    [Fact]
    public async Task Repo_Returns_False_Then_Result_Is_Failure()
    {
        var repo = new Mock<IWizardRepository>();
        var json = """{"ok":true}""";

        var successValidator = new FakeValidator(1, _ => Result<string>.Success(json));
        var sut = new SaveWizardStepCommandHandler(repo.Object, new[] { successValidator });

        var sid = Guid.NewGuid();
        var cmd = new SaveWizardStepCommand(sid, 1, 0, new { }, 1);

        repo.Setup(r => r.UpsertStepDataAsync(
                sid, 1, 0, json, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsFailure.Should().BeTrue();
        res.Error.Code.Should().Be("Database.SaveFailed");
        repo.VerifyAll();
    }

    [Fact]
    public async Task Chooses_Validator_By_StepNumber()
    {
        var repo = new Mock<IWizardRepository>();
        var v1 = new FakeValidator(1, _ => Result<string>.Success("""{"step":1}"""));
        var v2 = new FakeValidator(2, _ => Result<string>.Success("""{"step":2}"""));
        var sut = new SaveWizardStepCommandHandler(repo.Object, new IWizardStepValidator[] { v1, v2 });

        var sid = Guid.NewGuid();

        repo.Setup(r => r.UpsertStepDataAsync(sid, 2, 0, """{"step":2}""", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var res = await sut.Handle(new SaveWizardStepCommand(sid, 2, 0, new { }, 1), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        repo.VerifyAll();
    }
}
