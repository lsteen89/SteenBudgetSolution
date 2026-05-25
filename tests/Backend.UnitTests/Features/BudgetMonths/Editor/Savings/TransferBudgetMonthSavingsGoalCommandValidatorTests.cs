using Backend.Application.Features.Budgets.Months.Editor.Savings.TransferSavingsGoal;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

/// <summary>
/// PR-07 validator surface. The "withdraw must not push AmountSaved below
/// zero" rule is *not* tested here — it lives in the handler because it
/// depends on the loaded row.
/// </summary>
public sealed class TransferBudgetMonthSavingsGoalCommandValidatorTests
{
    private readonly TransferBudgetMonthSavingsGoalCommandValidator _sut = new();

    private static TransferBudgetMonthSavingsGoalCommand Build(
        decimal amount = 1_000m,
        string direction = SavingsGoalTransferDirections.Deposit,
        string? note = null,
        string yearMonth = "2026-01",
        Guid? persoid = null,
        Guid? monthGoalId = null)
        => new(
            Persoid: persoid ?? Guid.NewGuid(),
            YearMonth: yearMonth,
            MonthSavingsGoalId: monthGoalId ?? Guid.NewGuid(),
            Amount: amount,
            Direction: direction,
            Note: note);

    [Fact]
    public void Valid_Deposit_Passes()
    {
        _sut.TestValidate(Build()).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Valid_Withdraw_Passes()
    {
        _sut.TestValidate(Build(direction: SavingsGoalTransferDirections.Withdraw))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        _sut.TestValidate(Build(persoid: Guid.Empty))
            .ShouldHaveValidationErrorFor(x => x.Persoid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-month")]
    [InlineData("2026-13")]
    public void Invalid_YearMonth_Fails(string yearMonth)
    {
        _sut.TestValidate(Build(yearMonth: yearMonth))
            .ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Empty_MonthGoalId_Fails()
    {
        _sut.TestValidate(Build(monthGoalId: Guid.Empty))
            .ShouldHaveValidationErrorFor(x => x.MonthSavingsGoalId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-0.01)]
    public void Non_Positive_Amount_Fails(decimal value)
    {
        _sut.TestValidate(Build(amount: value))
            .ShouldHaveValidationErrorFor(x => x.Amount);
    }

    [Fact]
    public void Amount_At_Max_Passes()
    {
        _sut.TestValidate(Build(amount: TransferBudgetMonthSavingsGoalCommandValidator.MaxAmount))
            .ShouldNotHaveValidationErrorFor(x => x.Amount);
    }

    [Fact]
    public void Amount_Above_Max_Fails()
    {
        _sut.TestValidate(Build(amount: TransferBudgetMonthSavingsGoalCommandValidator.MaxAmount + 0.01m))
            .ShouldHaveValidationErrorFor(x => x.Amount);
    }

    [Fact]
    public void Amount_Three_Decimals_Fails()
    {
        _sut.TestValidate(Build(amount: 1234.567m))
            .ShouldHaveValidationErrorFor(x => x.Amount);
    }

    [Fact]
    public void Amount_Two_Decimals_Passes()
    {
        _sut.TestValidate(Build(amount: 1234.56m))
            .ShouldNotHaveValidationErrorFor(x => x.Amount);
    }

    [Fact]
    public void Amount_Whole_Number_Passes()
    {
        _sut.TestValidate(Build(amount: 1234m))
            .ShouldNotHaveValidationErrorFor(x => x.Amount);
    }

    [Theory]
    [InlineData("")]
    [InlineData("transfer")]
    [InlineData("DEPOSITT")]
    [InlineData("withdrawl")]
    public void Unknown_Direction_Fails(string direction)
    {
        _sut.TestValidate(Build(direction: direction))
            .ShouldHaveValidationErrorFor(x => x.Direction);
    }

    [Theory]
    [InlineData("deposit")]
    [InlineData("Deposit")]
    [InlineData("DEPOSIT")]
    [InlineData("withdraw")]
    [InlineData("Withdraw")]
    public void Case_Insensitive_Direction_Passes(string direction)
    {
        _sut.TestValidate(Build(direction: direction))
            .ShouldNotHaveValidationErrorFor(x => x.Direction);
    }

    [Fact]
    public void Note_Null_Passes()
    {
        _sut.TestValidate(Build(note: null))
            .ShouldNotHaveValidationErrorFor(x => x.Note);
    }

    [Fact]
    public void Note_At_Max_Length_Passes()
    {
        _sut.TestValidate(Build(note: new string('a', TransferBudgetMonthSavingsGoalCommandValidator.NoteMaxLength)))
            .ShouldNotHaveValidationErrorFor(x => x.Note);
    }

    [Fact]
    public void Note_Above_Max_Length_Fails()
    {
        _sut.TestValidate(Build(note: new string('a', TransferBudgetMonthSavingsGoalCommandValidator.NoteMaxLength + 1)))
            .ShouldHaveValidationErrorFor(x => x.Note);
    }
}
