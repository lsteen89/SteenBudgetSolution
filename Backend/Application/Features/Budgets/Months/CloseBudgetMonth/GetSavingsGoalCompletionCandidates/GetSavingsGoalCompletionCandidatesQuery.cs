using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.CloseBudgetMonth.GetSavingsGoalCompletionCandidates;

public sealed record GetSavingsGoalCompletionCandidatesQuery(
    Guid Persoid,
    string YearMonth
) : IQuery<Result<IReadOnlyList<SavingsGoalCompletionCandidateDto>>>;
