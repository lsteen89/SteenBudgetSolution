using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Shared;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Budgets.Months.EnsureFirstBudgetMonth;

public sealed record EnsureFirstBudgetMonthCommand(
    Guid Persoid,
    Guid ActorPersoid
) : ICommand<Result>, ITransactionalCommand;