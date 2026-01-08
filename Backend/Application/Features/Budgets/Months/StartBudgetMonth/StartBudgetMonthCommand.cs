using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Shared;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Budgets.Months.StartBudgetMonth;

public sealed record StartBudgetMonthCommand(
    Guid Persoid,
    Guid ActorPersoid,
    StartBudgetMonthRequestDto Request
) : ICommand<Result<BudgetMonthsStatusDto?>>, ITransactionalCommand;
