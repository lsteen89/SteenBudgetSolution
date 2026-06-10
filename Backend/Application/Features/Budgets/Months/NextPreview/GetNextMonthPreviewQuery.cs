using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.NextPreview;

/// <summary>
/// Read-only request for a next-month preview projected from the budget plan.
/// <paramref name="FromYearMonth"/> is the month the user is previewing forward
/// from (the active open month); the preview targets the following calendar
/// month. Handling this query never mutates state.
/// </summary>
public sealed record GetNextMonthPreviewQuery(Guid Persoid, string FromYearMonth)
    : IQuery<Result<NextMonthPreviewDto>>;
