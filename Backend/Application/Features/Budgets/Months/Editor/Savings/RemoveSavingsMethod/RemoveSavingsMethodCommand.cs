using Backend.Application.Common.Behaviors;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsMethod;

// Removes a plan-level savings method by row id. Idempotent: removing a row
// that no longer exists succeeds with `false`, so the editor never has to
// confirm or retry.
public sealed record RemoveSavingsMethodCommand(
    Guid Persoid,
    string YearMonth,
    Guid SavingsMethodId)
    : IRequest<Result<bool>>, ITransactionalCommand;
