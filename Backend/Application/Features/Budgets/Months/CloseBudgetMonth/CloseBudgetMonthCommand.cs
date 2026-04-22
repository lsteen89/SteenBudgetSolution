using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.CloseBudgetMonth;

public sealed record CloseBudgetMonthCommand(
    Guid Persoid,
    Guid ActorPersoid,
    string YearMonth,
    CloseBudgetMonthRequestDto Request
) : ICommand<Result<CloseBudgetMonthResultDto>>, ITransactionalCommand;
