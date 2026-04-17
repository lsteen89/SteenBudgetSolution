using Backend.Application.Common.Behaviors;
using Backend.Domain.Shared;
using MediatR;
using Backend.Application.DTO.Budget.Months.Editor;

namespace Backend.Application.Features.Budgets.Months.Editor.Queries;

public sealed record GetBudgetMonthEditorQuery(
    Guid Persoid,
    string YearMonth)
    : IRequest<Result<BudgetMonthEditorDto?>>, ITransactionalCommand;