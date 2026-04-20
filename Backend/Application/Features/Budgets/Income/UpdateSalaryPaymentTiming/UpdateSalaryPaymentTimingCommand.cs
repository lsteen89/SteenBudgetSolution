using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Income;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Income.UpdateSalaryPaymentTiming;

public sealed record UpdateSalaryPaymentTimingCommand(
    string Email,
    UpdateSalaryPaymentTimingRequestDto Request
) : ICommand<Result<SalaryPaymentTimingDto>>, ITransactionalCommand;
