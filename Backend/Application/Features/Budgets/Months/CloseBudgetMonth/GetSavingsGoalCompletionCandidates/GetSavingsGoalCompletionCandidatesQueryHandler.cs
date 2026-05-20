using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.Features.Budgets.Months.Models;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.CloseBudgetMonth.GetSavingsGoalCompletionCandidates;

// Returns the savings goals that the user could choose to mark as completed
// when closing the given month. The list is computed on the monthly row, not
// the baseline, and ProjectedAmountSaved/RemainingAfterContribution exist
// purely so the frontend can render the "would reach target this month"
// hint — closing the month does NOT mutate AmountSaved.
public sealed class GetSavingsGoalCompletionCandidatesQueryHandler
    : IQueryHandler<
        GetSavingsGoalCompletionCandidatesQuery,
        Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>>
{
    private readonly IBudgetMonthRepository _months;
    private readonly IBudgetMonthSavingsGoalMutationRepository _savingsGoals;

    public GetSavingsGoalCompletionCandidatesQueryHandler(
        IBudgetMonthRepository months,
        IBudgetMonthSavingsGoalMutationRepository savingsGoals)
    {
        _months = months;
        _savingsGoals = savingsGoals;
    }

    public async Task<Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>> Handle(
        GetSavingsGoalCompletionCandidatesQuery query,
        CancellationToken ct)
    {
        if (!YearMonthUtil.IsValid(query.YearMonth))
            return Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>
                .Failure(BudgetMonth.InvalidYearMonth);

        var yearMonth = YearMonthUtil.Normalize(query.YearMonth);

        var budgetId = await _months.GetBudgetIdByPersoidAsync(query.Persoid, ct);
        if (budgetId is null)
            return Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>
                .Failure(BudgetMonth.BudgetNotFound);

        var month = await _months.GetMonthAsync(budgetId.Value, yearMonth, ct);
        if (month is null)
            return Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>
                .Failure(BudgetMonth.MonthNotFound);

        // Candidates only make sense against the still-open month being
        // closed. Closed/skipped months are historical — no candidate UI
        // should appear over them, and they must not silently produce one.
        if (month.Status != BudgetMonthStatuses.Open)
            return Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>
                .Failure(BudgetMonth.MonthMustBeOpenToClose);

        var rows = await _savingsGoals.GetCompletionCandidatesAsync(month.Id, ct);
        return Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>
            .Success(rows.Select(ToDto).ToArray());
    }

    private static SavingsGoalCompletionCandidateDto ToDto(
        Backend.Application.Features.Budgets.Months.Editor.Models.Savings
            .BudgetMonthSavingsGoalCompletionCandidateReadModel row)
    {
        var amountSaved = row.AmountSaved ?? 0m;
        var projected = amountSaved + row.MonthlyContribution;
        var remaining = row.TargetAmount - projected;
        if (remaining < 0m) remaining = 0m;

        return new SavingsGoalCompletionCandidateDto(
            Id: row.Id,
            SourceSavingsGoalId: row.SourceSavingsGoalId,
            Name: row.Name,
            TargetAmount: row.TargetAmount,
            AmountSaved: amountSaved,
            MonthlyContribution: row.MonthlyContribution,
            ProjectedAmountSaved: projected,
            RemainingAfterContribution: remaining);
    }
}
