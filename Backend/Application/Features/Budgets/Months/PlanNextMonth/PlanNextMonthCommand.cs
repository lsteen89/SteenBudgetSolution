using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.PlanNextMonth;

public sealed record PlanNextMonthCommand(
    Guid Persoid,
    Guid ActorPersoid,
    string FromYearMonth
) : ICommand<Result<PlanNextMonthResultDto>>, ITransactionalCommand;
