using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.ChangeSavingsGoalTargetAmount;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using FluentAssertions;
using Moq;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

/// <summary>
/// PR-06 handler-level guards that integration can't reach. The
/// "source-linked row but missing baseline" edge can't be set up in
/// integration — the FK `ON DELETE SET NULL` nulls the snapshot link
/// the moment the baseline is removed — so we cover the defensive
/// guard with a Moq fake, exactly like
/// <see cref="RenameBudgetMonthSavingsGoalCommandHandlerTests"/>.
/// </summary>
public sealed class ChangeBudgetMonthSavingsGoalTargetAmountCommandHandlerTests
{
    [Fact]
    public async Task Handle_SourceLinkedGoalWithMissingBaseline_FailsBeforeWrites()
    {
        var persoid = Guid.NewGuid();
        var budgetMonthId = Guid.NewGuid();
        var monthSavingsGoalId = Guid.NewGuid();
        var budgetMonthSavingsId = Guid.NewGuid();
        var sourceSavingsGoalId = Guid.NewGuid();

        var lifecycle = new Mock<IBudgetMonthLifecycleService>(MockBehavior.Strict);
        lifecycle
            .Setup(x => x.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<EnsureBudgetMonthLifecycleResult>.Success(new EnsureBudgetMonthLifecycleResult
            {
                BudgetId = Guid.NewGuid(),
                BudgetMonthId = budgetMonthId,
                YearMonth = "2026-01"
            }));

        var repo = new Mock<IBudgetMonthSavingsGoalMutationRepository>(MockBehavior.Strict);
        repo
            .Setup(x => x.GetBudgetMonthMetaAsync(budgetMonthId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BudgetMonthMutationMetaReadModel(budgetMonthId, "2026-01", BudgetMonthStatuses.Open));
        repo
            .Setup(x => x.GetSavingsGoalForMutationAsync(budgetMonthId, monthSavingsGoalId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BudgetMonthSavingsGoalMutationReadModel
            {
                Id = monthSavingsGoalId,
                BudgetMonthId = budgetMonthId,
                BudgetMonthSavingsId = budgetMonthSavingsId,
                SourceSavingsGoalId = sourceSavingsGoalId,
                Name = "Emergency fund",
                TargetAmount = 50_000m,
                TargetDate = new DateTime(2026, 12, 31),
                AmountSaved = 10_000m,
                MonthlyContribution = 1_500m,
                Status = "active",
                IsDeleted = false
            });
        repo
            .Setup(x => x.BaselineSavingsGoalExistsAsync(sourceSavingsGoalId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var changeEvents = new Mock<IBudgetMonthChangeEventRepository>(MockBehavior.Strict);

        var sut = new ChangeBudgetMonthSavingsGoalTargetAmountCommandHandler(
            lifecycle.Object,
            repo.Object,
            changeEvents.Object,
            TimeProvider.System);

        var result = await sut.Handle(
            new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                Persoid: persoid,
                YearMonth: "2026-01",
                MonthSavingsGoalId: monthSavingsGoalId,
                TargetAmount: 75_000m),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(BudgetMonthSavingsGoalErrors.SourcePlanNotFound.Code);

        repo.Verify(
            x => x.UpdateMonthSavingsGoalTargetAmountAsync(It.IsAny<UpdateBudgetMonthSavingsGoalTargetAmountModel>(), It.IsAny<CancellationToken>()),
            Times.Never);
        repo.Verify(
            x => x.UpdateBaselineSavingsGoalTargetAmountAsync(It.IsAny<UpdateBaselineSavingsGoalTargetAmountModel>(), It.IsAny<CancellationToken>()),
            Times.Never);
        repo.Verify(
            x => x.UpdateOpenLinkedMonthSavingsGoalTargetAmountAsync(It.IsAny<UpdateOpenLinkedMonthSavingsGoalTargetAmountModel>(), It.IsAny<CancellationToken>()),
            Times.Never);
        changeEvents.Verify(
            x => x.InsertAsync(It.IsAny<BudgetMonthChangeEventWriteModel>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
