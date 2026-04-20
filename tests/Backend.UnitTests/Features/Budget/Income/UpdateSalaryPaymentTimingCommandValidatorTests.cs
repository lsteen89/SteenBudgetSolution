using Backend.Application.DTO.Budget.Income;
using Backend.Application.Features.Budgets.Income.UpdateSalaryPaymentTiming;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.Budget.Income;

public sealed class UpdateSalaryPaymentTimingCommandValidatorTests
{
    private readonly UpdateSalaryPaymentTimingCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var command = new UpdateSalaryPaymentTimingCommand(
            Email: "linus@example.com",
            Request: new UpdateSalaryPaymentTimingRequestDto(
                IncomePaymentDayType: "dayOfMonth",
                IncomePaymentDay: 25,
                UpdateCurrentAndFuture: true));

        var result = _sut.TestValidate(command);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Email_Fails()
    {
        var command = new UpdateSalaryPaymentTimingCommand(
            Email: "",
            Request: new UpdateSalaryPaymentTimingRequestDto(
                IncomePaymentDayType: "lastDayOfMonth",
                IncomePaymentDay: null,
                UpdateCurrentAndFuture: false));

        var result = _sut.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Email);
    }
}
