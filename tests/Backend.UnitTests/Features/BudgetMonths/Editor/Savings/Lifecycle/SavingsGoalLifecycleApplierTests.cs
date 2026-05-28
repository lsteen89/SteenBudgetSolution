using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.Lifecycle;
using Backend.Domain.Errors.Budget;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings.Lifecycle;

public sealed class SavingsGoalLifecycleApplierTests
{
    private static readonly DateTime FixedUtcNow =
        new(2026, 05, 19, 12, 00, 00, DateTimeKind.Utc);

    private static SavingsGoalLifecycleSnapshot Active() =>
        new(SavingsGoalStatuses.Active, ClosedReason: null, ClosedAt: null);

    private static SavingsGoalLifecycleSnapshot Closed(string reason) =>
        new(SavingsGoalStatuses.Closed,
            ClosedReason: reason,
            ClosedAt: new DateTime(2026, 04, 01, 09, 00, 00, DateTimeKind.Utc));

    // 1
    [Fact]
    public void Active_Goal_Can_Complete()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            Active(), SavingsGoalLifecycleActions.Complete, FixedUtcNow);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(SavingsGoalStatuses.Closed, result.Value!.After.Status);
        Assert.Equal(SavingsGoalClosedReasons.Completed, result.Value.After.ClosedReason);
        Assert.Equal(FixedUtcNow, result.Value.After.ClosedAt);
        Assert.Equal(SavingsGoalStatuses.Active, result.Value.Before.Status);
        Assert.Null(result.Value.Before.ClosedReason);
        Assert.Null(result.Value.Before.ClosedAt);
    }

    // 2
    [Fact]
    public void Active_Goal_Can_Cancel()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            Active(), SavingsGoalLifecycleActions.Cancel, FixedUtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(SavingsGoalClosedReasons.Cancelled, result.Value!.After.ClosedReason);
        Assert.Equal(SavingsGoalStatuses.Closed, result.Value.After.Status);
        Assert.Equal(FixedUtcNow, result.Value.After.ClosedAt);
    }

    // 3
    [Fact]
    public void Active_Goal_Can_Remove()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            Active(), SavingsGoalLifecycleActions.Remove, FixedUtcNow);

        Assert.True(result.IsSuccess);
        Assert.Equal(SavingsGoalClosedReasons.Removed, result.Value!.After.ClosedReason);
        Assert.Equal(SavingsGoalStatuses.Closed, result.Value.After.Status);
        Assert.Equal(FixedUtcNow, result.Value.After.ClosedAt);
    }

    // 4
    [Fact]
    public void Closed_Goal_Cannot_Complete_Again()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            Closed(SavingsGoalClosedReasons.Completed),
            SavingsGoalLifecycleActions.Complete,
            FixedUtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.AlreadyClosed, result.Error);
    }

    // 5
    [Fact]
    public void Closed_Goal_Cannot_Cancel_Again()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            Closed(SavingsGoalClosedReasons.Cancelled),
            SavingsGoalLifecycleActions.Cancel,
            FixedUtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.AlreadyClosed, result.Error);
    }

    // 6
    [Fact]
    public void Closed_Goal_Cannot_Remove_Again()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            Closed(SavingsGoalClosedReasons.Removed),
            SavingsGoalLifecycleActions.Remove,
            FixedUtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.AlreadyClosed, result.Error);
    }

    // 7
    [Fact]
    public void Active_Goal_Cannot_Have_ClosedReason()
    {
        var inconsistent = new SavingsGoalLifecycleSnapshot(
            Status: SavingsGoalStatuses.Active,
            ClosedReason: SavingsGoalClosedReasons.Completed,
            ClosedAt: null);

        var result = SavingsGoalLifecycleApplier.EnsureSnapshotIsConsistent(inconsistent);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.ActiveGoalHasClosedReason, result.Error);
    }

    [Fact]
    public void Active_Goal_Cannot_Have_ClosedAt()
    {
        var inconsistent = new SavingsGoalLifecycleSnapshot(
            Status: SavingsGoalStatuses.Active,
            ClosedReason: null,
            ClosedAt: FixedUtcNow);

        var result = SavingsGoalLifecycleApplier.EnsureSnapshotIsConsistent(inconsistent);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.ActiveGoalHasClosedAt, result.Error);
    }

    // 8
    [Fact]
    public void Closed_Goal_Must_Have_ClosedReason()
    {
        var inconsistent = new SavingsGoalLifecycleSnapshot(
            Status: SavingsGoalStatuses.Closed,
            ClosedReason: null,
            ClosedAt: FixedUtcNow);

        var result = SavingsGoalLifecycleApplier.EnsureSnapshotIsConsistent(inconsistent);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.ClosedGoalMissingReason, result.Error);
    }

    [Fact]
    public void Closed_Goal_Must_Have_ClosedAt()
    {
        var inconsistent = new SavingsGoalLifecycleSnapshot(
            Status: SavingsGoalStatuses.Closed,
            ClosedReason: SavingsGoalClosedReasons.Completed,
            ClosedAt: null);

        var result = SavingsGoalLifecycleApplier.EnsureSnapshotIsConsistent(inconsistent);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.ClosedGoalMissingClosedAt, result.Error);
    }

    // 9
    [Fact]
    public void MonthOnly_Goal_Does_Not_Attempt_Source_Update()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToSourceGoalIfLinked(
            sourceCurrent: null,
            action: SavingsGoalLifecycleActions.Complete,
            nowUtc: FixedUtcNow);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    // 10
    [Fact]
    public void Linked_Goal_Updates_Both_Source_And_Month_Row()
    {
        var month = Active();
        var source = Active();

        var monthResult = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            month, SavingsGoalLifecycleActions.Complete, FixedUtcNow);
        var sourceResult = SavingsGoalLifecycleApplier.ApplyToSourceGoalIfLinked(
            source, SavingsGoalLifecycleActions.Complete, FixedUtcNow);

        Assert.True(monthResult.IsSuccess);
        Assert.True(sourceResult.IsSuccess);
        Assert.NotNull(sourceResult.Value);

        Assert.Equal(SavingsGoalStatuses.Closed, monthResult.Value!.After.Status);
        Assert.Equal(SavingsGoalStatuses.Closed, sourceResult.Value!.After.Status);
        Assert.Equal(SavingsGoalClosedReasons.Completed, monthResult.Value.After.ClosedReason);
        Assert.Equal(SavingsGoalClosedReasons.Completed, sourceResult.Value.After.ClosedReason);
        Assert.Equal(FixedUtcNow, monthResult.Value.After.ClosedAt);
        Assert.Equal(FixedUtcNow, sourceResult.Value.After.ClosedAt);
    }

    // 11
    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public void Closed_Or_Skipped_Month_Rejects_Lifecycle_Change(string monthStatus)
    {
        var result = SavingsGoalLifecycleApplier.EnsureMonthAllowsLifecycle(monthStatus);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.MonthNotOpen, result.Error);
    }

    [Fact]
    public void Open_Month_Allows_Lifecycle_Change()
    {
        var result = SavingsGoalLifecycleApplier.EnsureMonthAllowsLifecycle(BudgetMonthStatuses.Open);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void Unknown_Action_Is_Rejected()
    {
        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            Active(), action: "archive", FixedUtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.UnknownAction, result.Error);
    }

    [Fact]
    public void Unsupported_Status_Is_Rejected_Before_Transition()
    {
        var inconsistent = new SavingsGoalLifecycleSnapshot(
            Status: "paused",
            ClosedReason: null,
            ClosedAt: null);

        var result = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            inconsistent, SavingsGoalLifecycleActions.Complete, FixedUtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.InvalidStatus, result.Error);
    }

    [Fact]
    public void Linked_Source_Goal_Already_Closed_Is_Rejected()
    {
        var alreadyClosed = Closed(SavingsGoalClosedReasons.Cancelled);

        var result = SavingsGoalLifecycleApplier.ApplyToSourceGoalIfLinked(
            alreadyClosed,
            SavingsGoalLifecycleActions.Complete,
            FixedUtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(SavingsGoalLifecycleErrors.AlreadyClosed, result.Error);
    }
}
